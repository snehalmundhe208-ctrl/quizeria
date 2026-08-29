const prisma = require('../utils/prisma');
const aiService = require('../services/aiService');

/**
 * Generates questions using Gemini from document chunks
 * Returns them for review before saving to DB
 */
exports.generateAIQuestions = async (req, res) => {
  try {
    const { id: documentId } = req.params;
    const { count = 10, difficulty = 'MEDIUM', types = ['MCQ'] } = req.body;

    // Verify document ownership
    const doc = await prisma.document.findFirst({
      where: { id: documentId, userId: req.user.id }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Retrieve document chunks
    const chunks = await prisma.documentChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' }
    });

    if (chunks.length === 0) {
      return res.status(400).json({ error: 'No processed chunks found for this document. Please process the document first.' });
    }

    const totalQuestionsRequested = parseInt(count, 10);
    const questionsToGenerate = [];
    let apiErrorCount = 0;      // counts failures due to API/config issues
    let validationDropCount = 0; // counts questions that generated OK but failed schema validation
    let lastApiError = null;

    // Distribute questions across chunks
    for (let i = 0; i < totalQuestionsRequested; i++) {
      const chunk = chunks[i % chunks.length];
      
      // Determine difficulty for this question
      let questionDifficulty = difficulty;
      if (difficulty === 'MIXED') {
        const diffs = ['EASY', 'MEDIUM', 'HARD'];
        questionDifficulty = diffs[Math.floor(Math.random() * diffs.length)];
      }

      const questionType = types[i % types.length];

      let generatedQ = null;
      let retries = 0;
      let isValid = false;

      while (!isValid && retries < 3) {
        try {
          const results = await aiService.generateQuestions(chunk.text, {
            count: 1,
            difficulty: questionDifficulty,
            types: [questionType],
            pageNumber: chunk.pageNumber,
            sectionTitle: chunk.sectionTitle
          });

          if (results && results.length > 0) {
            const candidate = results[0];
            
            if (aiService.validateQuestion(candidate)) {
              const normalizedText = candidate.questionText.trim().toLowerCase();
              
              const dbExists = await prisma.question.findFirst({
                where: {
                  documentId,
                  questionText: { equals: candidate.questionText, mode: 'insensitive' }
                }
              });

              const batchExists = questionsToGenerate.some(
                q => q.questionText.trim().toLowerCase() === normalizedText
              );

              if (!dbExists && !batchExists) {
                generatedQ = {
                  ...candidate,
                  chunkId: chunk.id,
                  documentId
                };
                isValid = true;
              } else {
                console.log(`Duplicate question detected: "${candidate.questionText}". Retrying...`);
              }
            } else {
              console.log("Generated question failed schema validation. Retrying...");
              validationDropCount++;
            }
          }
        } catch (err) {
          // Distinguish API/config errors from transient errors
          const isApiError = err.message && (
            err.message.includes('API key') ||
            err.message.includes('not configured') ||
            err.message.includes('quota') ||
            err.message.includes('PERMISSION_DENIED') ||
            err.message.includes('API_KEY_INVALID')
          );

          if (isApiError) {
            lastApiError = err.message;
            apiErrorCount++;
            console.error(`AI API error (question ${i + 1}):`, err.message);
            break; // No point retrying if the key is missing/invalid
          } else {
            console.error("Error generating question from chunk, retrying...", err.message);
          }
        }
        retries++;
      }

      if (generatedQ) {
        questionsToGenerate.push(generatedQ);
      }
    }

    // If every question failed due to an API/config error, return a proper error response
    if (questionsToGenerate.length === 0 && apiErrorCount > 0) {
      return res.status(503).json({
        error: `AI service is unavailable: ${lastApiError || 'API key not configured'}. Please add a valid GEMINI_API_KEY to the server .env file and restart.`
      });
    }

    // If we got some questions but some were silently dropped, include a warning
    const warning = validationDropCount > 0
      ? `${validationDropCount} AI-generated question(s) were dropped because they failed quality validation (e.g. duplicate options, bad answer format). The remaining ${questionsToGenerate.length} passed.`
      : null;

    res.json({
      message: `Generated ${questionsToGenerate.length} questions for review.`,
      questions: questionsToGenerate,
      ...(warning && { warning })
    });
  } catch (error) {
    console.error('Question generation error:', error);
    res.status(500).json({ error: 'Failed to generate questions.' });
  }
};

/**
 * Save reviewed questions in bulk
 */
exports.bulkSaveQuestions = async (req, res) => {
  try {
    const { documentId, questions } = req.body;

    if (!documentId || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Missing documentId or questions array.' });
    }

    // Verify document ownership
    const doc = await prisma.document.findFirst({
      where: { id: documentId, userId: req.user.id }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found or unauthorized.' });
    }

    const saved = [];
    await prisma.$transaction(async (tx) => {
      for (const q of questions) {
        const typeEnum = q.type.toUpperCase(); // MCQ | TRUE_FALSE | SHORT_ANSWER
        const diffEnum = q.difficulty.toUpperCase(); // EASY | MEDIUM | HARD

        const created = await tx.question.create({
          data: {
            documentId,
            chunkId: q.chunkId || null,
            type: typeEnum,
            questionText: q.questionText,
            options: q.options || null,
            correctAnswer: String(q.correctAnswer),
            explanation: q.explanation || null,
            difficulty: diffEnum,
            topic: q.topic || 'General',
            sourcePage: q.sourcePage ? parseInt(q.sourcePage, 10) : null,
            sourceSection: q.sourceSection || null
          }
        });
        saved.push(created);
      }
    });

    res.status(201).json({
      message: `Saved ${saved.length} questions to the Question Bank.`,
      count: saved.length
    });
  } catch (error) {
    console.error('Bulk save questions error:', error);
    res.status(500).json({ error: 'Failed to save questions to database.' });
  }
};

/**
 * Retrieve Questions from bank, scoped to user documents
 */
exports.getQuestions = async (req, res) => {
  try {
    const { documentId, topic, difficulty, type } = req.query;

    const where = {
      document: {
        userId: req.user.id
      }
    };

    if (documentId) {
      where.documentId = documentId;
    }
    if (topic) {
      where.topic = { equals: topic, mode: 'insensitive' };
    }
    if (difficulty) {
      where.difficulty = difficulty.toUpperCase();
    }
    if (type) {
      where.type = type.toUpperCase();
    }

    const questions = await prisma.question.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        document: {
          select: { name: true }
        }
      }
    });

    res.json({ questions });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Failed to retrieve questions.' });
  }
};

/**
 * Update a specific question in the bank
 */
exports.updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { questionText, options, correctAnswer, explanation, difficulty, topic, sourcePage, sourceSection } = req.body;

    // Verify ownership via document relation
    const question = await prisma.question.findFirst({
      where: {
        id,
        document: { userId: req.user.id }
      }
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found or unauthorized.' });
    }

    const updated = await prisma.question.update({
      where: { id },
      data: {
        questionText: questionText || question.questionText,
        options: options !== undefined ? options : question.options,
        correctAnswer: correctAnswer !== undefined ? String(correctAnswer) : question.correctAnswer,
        explanation: explanation !== undefined ? explanation : question.explanation,
        difficulty: difficulty ? difficulty.toUpperCase() : question.difficulty,
        topic: topic || question.topic,
        sourcePage: sourcePage !== undefined ? (sourcePage ? parseInt(sourcePage, 10) : null) : question.sourcePage,
        sourceSection: sourceSection !== undefined ? sourceSection : question.sourceSection
      }
    });

    res.json({
      message: 'Question updated successfully.',
      question: updated
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ error: 'Failed to update question.' });
  }
};

/**
 * Delete a specific question
 */
exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const question = await prisma.question.findFirst({
      where: {
        id,
        document: { userId: req.user.id }
      }
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found or unauthorized.' });
    }

    await prisma.question.delete({
      where: { id }
    });

    res.json({ message: 'Question deleted successfully from bank.' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Failed to delete question.' });
  }
};

/**
 * Regenerates a single AI question based on a specific chunk
 */
exports.regenerateAIQuestion = async (req, res) => {
  try {
    const { chunkId, type, difficulty } = req.body;

    if (!chunkId) {
      return res.status(400).json({ error: 'Missing chunkId.' });
    }

    const chunk = await prisma.documentChunk.findFirst({
      where: {
        id: chunkId,
        document: { userId: req.user.id }
      }
    });

    if (!chunk) {
      return res.status(404).json({ error: 'Chunk not found or unauthorized.' });
    }

    const results = await aiService.generateQuestions(chunk.text, {
      count: 1,
      difficulty: difficulty || 'MEDIUM',
      types: [type || 'MCQ'],
      pageNumber: chunk.pageNumber,
      sectionTitle: chunk.sectionTitle
    });

    if (results && results.length > 0) {
      const q = results[0];
      if (aiService.validateQuestion(q)) {
        return res.json({
          question: {
            ...q,
            chunkId: chunk.id,
            documentId: chunk.documentId
          }
        });
      }
    }

    res.status(500).json({ error: 'Failed to generate a valid replacement question. Please try again.' });
  } catch (error) {
    console.error('Regenerate question error:', error);
    res.status(500).json({ error: 'An error occurred while regenerating the question.' });
  }
};
