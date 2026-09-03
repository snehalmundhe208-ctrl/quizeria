const fs = require('fs');
const path = require('path');
const prisma = require('../utils/prisma');
const documentProcessor = require('../services/documentProcessor');
const aiService = require('../services/aiService');

/**
 * Handle document upload & db logging
 */
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const ext = path.extname(req.file.originalname).toUpperCase().replace('.', '');
    let docType;
    if (ext === 'PDF') docType = 'PDF';
    else if (ext === 'DOCX') docType = 'DOCX';
    else if (ext === 'PPTX' || ext === 'PPT') docType = 'PPTX';
    else docType = 'TXT';

    const document = await prisma.document.create({
      data: {
        name: req.file.originalname,
        systemFilename: req.file.filename,
        type: docType,
        path: req.file.path,
        status: 'UPLOADED',
        userId: req.user.id
      }
    });

    res.status(201).json({
      message: 'File uploaded successfully.',
      document
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document.' });
  }
};

/**
 * Asynchronously process document: extract text, chunk content, generate educational insights
 */
exports.processDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    if (document.status === 'PROCESSING') {
      return res.status(400).json({ error: 'Document is already being processed.' });
    }

    // Set status to processing, clear any previous failure reason
    await prisma.document.update({
      where: { id },
      data: { status: 'PROCESSING', failureReason: null }
    });

    // Run processing pipeline in background
    runProcessingPipeline(id, document.path, document.type, document.name).catch((err) => {
      console.error(`Pipeline failure for document ID: ${id}:`, err);
    });

    res.status(202).json({
      message: 'Document processing initiated.',
      status: 'PROCESSING'
    });
  } catch (error) {
    console.error('Process document handler error:', error);
    res.status(500).json({ error: 'Failed to initiate document processing.' });
  }
};

/**
 * Sanitize extracted text: strip null bytes and other characters PostgreSQL TEXT
 * columns reject (notably \x00 which causes error code 22021).
 */
const sanitizeText = (text) => {
  if (!text) return '';
  // Remove null bytes and other problematic control characters
  // Keep newlines (\n), tabs (\t), carriage returns (\r) which are legitimate
  return text.replace(/\x00/g, '').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
};

/**
 * Pipeline helper
 */
const runProcessingPipeline = async (documentId, filePath, fileType, originalName) => {
  try {
    // 1. Text extraction page by page
    const pages = await documentProcessor.extractTextPageByPage(filePath, fileType, originalName);
    const pageCount = pages.length;

    // Sanitize each page's text to remove null bytes / invalid sequences
    const sanitizedPages = pages.map(p => ({ ...p, text: sanitizeText(p.text) }));
    const fullText = sanitizedPages.map(p => p.text).join('\n');

    if (!fullText.trim()) {
      throw new Error("Empty document — no readable text could be extracted. The file may be a scanned image PDF or use an unsupported encoding.");
    }

    // 2. Analyze document for educational insights
    const insights = await documentProcessor.generateInsights(fullText);

    // 3. Generate section-aware chunks (using sanitized pages)
    const chunks = documentProcessor.generateChunks(sanitizedPages, documentId);

    // Sanitize chunk text too
    const sanitizedChunks = chunks.map(c => ({ ...c, text: sanitizeText(c.text) }));

    // Save pages and chunks in a database transaction
    await prisma.$transaction(async (tx) => {
      // Clean old chunks if any exist (re-processing safety)
      await tx.documentChunk.deleteMany({
        where: { documentId }
      });

      // Insert new chunks
      if (sanitizedChunks.length > 0) {
        await tx.documentChunk.createMany({
          data: sanitizedChunks
        });
      }

      // Update main document fields
      await tx.document.update({
        where: { id: documentId },
        data: {
          status: 'PROCESSED',
          pageCount,
          extractedText: fullText,
          insights: insights,
          failureReason: null  // clear any previous failure reason
        }
      });
    });

    console.log(`Document ID ${documentId} processed successfully. Created ${sanitizedChunks.length} chunks.`);
  } catch (err) {
    console.error(`Error processing document ${documentId}:`, err);

    // Build a clean, user-facing failure message (no internal stack details)
    let failureReason = 'Processing failed due to an unexpected error.';
    if (err.message) {
      if (err.message.includes('invalid byte sequence') || err.message.includes('0x00')) {
        failureReason = 'This file contains invalid or binary characters that could not be stored. Try re-saving the PDF with standard encoding and re-uploading.';
      } else if (err.message.includes('Empty document')) {
        failureReason = err.message;
      } else if (err.message.includes('GEMINI') || err.message.includes('API') || err.message.includes('quota')) {
        failureReason = 'AI insight generation failed (API error or quota exceeded). Try processing again in a few minutes.';
      } else {
        failureReason = `Processing error: ${err.message.substring(0, 300)}`;
      }
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'FAILED', failureReason }
    }).catch(e => console.error("Failed to update status to FAILED:", e));
  }
};

/**
 * Fetch all documents owned by user
 */
exports.getDocuments = async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });

    res.json({ documents });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to retrieve documents.' });
  }
};

/**
 * Get document details with chunks & insights
 */
exports.getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findFirst({
      where: { id, userId: req.user.id },
      include: {
        chunks: {
          orderBy: { chunkIndex: 'asc' }
        },
        _count: {
          select: { questions: true }
        }
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    res.json({ document });
  } catch (error) {
    console.error('Get document by ID error:', error);
    res.status(500).json({ error: 'Failed to retrieve document details.' });
  }
};

/**
 * Get AI document insights
 */
exports.getDocumentInsights = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findFirst({
      where: { id, userId: req.user.id },
      select: {
        id: true,
        name: true,
        type: true,
        pageCount: true,
        status: true,
        insights: true,
        failureReason: true,
        createdAt: true,
        _count: {
          select: { chunks: true, questions: true }
        }
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    res.json({
      documentId: document.id,
      name: document.name,
      type: document.type,
      status: document.status,
      pageCount: document.pageCount,
      chunkCount: document._count.chunks,
      questionCount: document._count.questions,
      insights: document.insights || {
        topics: [],
        concepts: [],
        definitions: [],
        formulas: [],
        suggestedQuizTopics: [],
        difficulty: "MEDIUM"
      }
    });
  } catch (error) {
    console.error('Get document insights error:', error);
    res.status(500).json({ error: 'Failed to retrieve document insights.' });
  }
};

/**
 * AI Study Assistant — Q&A grounded in document text
 */
exports.chatWithDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Chat message is required.' });
    }

    const document = await prisma.document.findFirst({
      where: { id, userId: req.user.id },
      include: {
        chunks: {
          take: 5,
          orderBy: { chunkIndex: 'asc' }
        }
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found or unauthorized.' });
    }

    const contextText = document.chunks.map(c => c.text).join('\n\n').substring(0, 4000);

    const prompt = `You are StudyForge AI Study Assistant. Answer the user's question clearly and concisely based ONLY on the provided document context.

DOCUMENT CONTEXT:
${contextText}

USER QUESTION:
${message}

Provide a helpful, educational response formatted with markdown. If the question cannot be answered from the document, kindly state that.`;

    let aiResponse;
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI response timeout')), 2500));
      aiResponse = await Promise.race([aiService.generateExplanation(prompt), timeoutPromise]);
    } catch (err) {
      console.log('AI Chat fallback triggered:', err.message);
      aiResponse = `Based on document context from page 1:\n\n${contextText.substring(0, 350)}...`;
    }

    res.json({
      reply: aiResponse || `Based on document context:\n\n${contextText.substring(0, 350)}...`
    });
  } catch (error) {
    console.error('Chat with document error:', error);
    res.status(500).json({ error: 'Failed to generate AI response.' });
  }
};

/**
 * Delete document & associated files
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Delete file from disk
    if (fs.existsSync(document.path)) {
      fs.unlinkSync(document.path);
    }

    // Cascade deletes in database (Prisma cascade relations will handle chunks/questions)
    await prisma.document.delete({
      where: { id }
    });

    res.json({ message: 'Document and associated data deleted successfully.' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document.' });
  }
};
