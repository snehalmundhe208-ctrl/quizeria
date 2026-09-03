const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const officeParser = require('officeparser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const aiConfig = require('../config/aiConfig');

const genAI = new GoogleGenerativeAI(aiConfig.GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(aiConfig.GEMINI_API_KEY);

/**
 * Main parser controller
 */
const extractTextPageByPage = async (filePath, fileType, originalName) => {
  if (fileType === 'TXT') {
    const text = await fs.promises.readFile(filePath, 'utf8');
    return [{ pageNumber: 1, text }];
  } 
  
  if (fileType === 'DOCX') {
    const result = await mammoth.extractRawText({ path: filePath });
    // Split text into pages of ~3000 chars roughly if no page markers exist
    const fullText = result.value;
    return splitTextIntoMockPages(fullText);
  } 
  
  if (fileType === 'PPTX') {
    const text = await officeParser.parsePromise(filePath);
    return splitTextIntoMockPages(text);
  } 
  
  if (fileType === 'PDF') {
    return await extractPdfPages(filePath, originalName);
  }

  throw new Error(`Unsupported document type: ${fileType}`);
};

/**
 * Splits unpaginated text formats like Word or PPTX into logical pages
 */
const splitTextIntoMockPages = (fullText) => {
  const pages = [];
  const paragraphs = fullText.split(/\n\s*\n/);
  let currentPageText = '';
  let currentPageNum = 1;

  for (const para of paragraphs) {
    if ((currentPageText + para).length > 2500) {
      pages.push({ pageNumber: currentPageNum, text: currentPageText.trim() });
      currentPageText = para;
      currentPageNum++;
    } else {
      currentPageText += '\n\n' + para;
    }
  }
  if (currentPageText.trim()) {
    pages.push({ pageNumber: currentPageNum, text: currentPageText.trim() });
  }
  return pages;
};

/**
 * Extracts page-by-page text from PDFs and falls back to Gemini OCR if scanned
 */
const extractPdfPages = async (filePath, originalName) => {
  const dataBuffer = fs.readFileSync(filePath);
  const pages = [];

  const pagerender = (pageData) => {
    return pageData.getTextContent().then((textContent) => {
      let lastY, text = '';
      for (const item of textContent.items) {
        if (lastY === item.transform[5] || !lastY) {
          text += item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[5];
      }
      pages.push({
        pageNumber: pageData.pageIndex + 1,
        text: text
      });
      return text;
    });
  };

  try {
    const pdfParsed = await pdf(dataBuffer, { pagerender });
    pages.sort((a, b) => a.pageNumber - b.pageNumber);

    // Calculate text density to determine if PDF is scanned
    const totalChars = pages.reduce((sum, p) => sum + p.text.trim().length, 0);
    const avgCharsPerPage = pages.length > 0 ? totalChars / pages.length : 0;

    if (totalChars < 100 || avgCharsPerPage < 30) {
      console.log(`Low text density (${totalChars} chars total). Triggering Gemini OCR File API fallback...`);
      if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key missing. Cannot run OCR fallback.");
      }
      return await runGeminiOCR(filePath, originalName);
    }

    return pages;
  } catch (err) {
    console.error("PDF Parsing failed locally, attempting Gemini OCR...", err);
    if (GEMINI_API_KEY) {
      return await runGeminiOCR(filePath, originalName);
    }
    throw err;
  }
};

/**
 * Uploads scanned document to Gemini File API and transcribes page-by-page text
 */
const runGeminiOCR = async (filePath, originalName) => {
  const uploadResult = await fileManager.uploadFile(filePath, {
    mimeType: "application/pdf",
    displayName: originalName
  });

  // Polling check for file processing status
  let file = await fileManager.getFile(uploadResult.name);
  while (file.state === "PROCESSING") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    file = await fileManager.getFile(uploadResult.name);
  }

  if (file.state === "FAILED") {
    throw new Error("Gemini failed to process the PDF upload.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: aiConfig.GEMINI_MODEL });
    const prompt = `Transcribe this scanned PDF document page-by-page. Format the output as a valid JSON array of objects, where each object has fields "pageNumber" (integer) and "text" (string). Extract all headings, text blocks, and structured lists. Return ONLY raw JSON matching this schema, no markdown wrappers, backticks, or other text. Example: [{"pageNumber": 1, "text": "transcribed page content..."}]`;

    const result = await model.generateContent([
      {
        fileData: {
          fileUri: uploadResult.uri,
          mimeType: uploadResult.mimeType
        }
      },
      { text: prompt }
    ]);

    const textResponse = result.response.text().trim();
    let cleanedJson = textResponse;
    if (cleanedJson.startsWith('```json')) cleanedJson = cleanedJson.substring(7);
    if (cleanedJson.startsWith('```')) cleanedJson = cleanedJson.substring(3);
    if (cleanedJson.endsWith('```')) cleanedJson = cleanedJson.substring(0, cleanedJson.length - 3);

    const transcribed = JSON.parse(cleanedJson.trim());
    return transcribed.sort((a, b) => a.pageNumber - b.pageNumber);
  } finally {
    // Delete file from Google storage after OCR extraction
    await fileManager.deleteFile(uploadResult.name).catch((err) => {
      console.error("Cleanup error deleting file from Gemini servers:", err);
    });
  }
};

/**
 * Partitions pages into logical semantic chunks
 */
const generateChunks = (pages, documentId) => {
  const chunks = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const lines = page.text.split('\n');
    let currentSection = 'General Content';
    let currentBuffer = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Section/heading detection rules
      const isHeading = 
        trimmed.length < 80 && 
        !trimmed.endsWith('.') && 
        !trimmed.endsWith(',') &&
        (
          /^[A-Z0-9\s.-]+$/.test(trimmed) || // UPPERCASE HEADING
          /^(Chapter|Section|Unit|Topic)\s+\d+/i.test(trimmed) || // Section identifiers
          /^\d+(\.\d+)*\s+[A-Za-z]/.test(trimmed) // numbered titles like 1.2 Introduction
        );

      if (isHeading) {
        // Flush previous chunk if it holds content
        if (currentBuffer.trim().length > 200) {
          chunks.push({
            documentId,
            pageNumber: page.pageNumber,
            sectionTitle: currentSection,
            chunkIndex: chunkIndex++,
            text: currentBuffer.trim()
          });
          currentBuffer = '';
        }
        currentSection = trimmed;
      } else {
        currentBuffer += '\n' + trimmed;
      }

      // Flush when chunk limits are met
      if (currentBuffer.length >= 1500) {
        chunks.push({
          documentId,
          pageNumber: page.pageNumber,
          sectionTitle: currentSection,
          chunkIndex: chunkIndex++,
          text: currentBuffer.trim()
        });
        currentBuffer = '';
      }
    }

    // Flush any remaining text at page boundary
    if (currentBuffer.trim().length > 0) {
      chunks.push({
        documentId,
        pageNumber: page.pageNumber,
        sectionTitle: currentSection,
        chunkIndex: chunkIndex++,
        text: currentBuffer.trim()
      });
    }
  }

  return chunks;
};

/**
 * Extracts high-level curriculum insights (Topics, definitions, formulas)
 */
const generateInsights = async (fullText) => {
  if (!aiConfig.GEMINI_API_KEY) {
    return {
      topics: [],
      concepts: [],
      definitions: [],
      formulas: [],
      suggestedQuizTopics: [],
      difficulty: "MEDIUM"
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: aiConfig.GEMINI_MODEL });
    const textSample = fullText.slice(0, 50000); // Truncate text for prompt token safety

    const prompt = `Analyze this educational material and extract key study insights.
Format the output as a valid JSON object matching this schema:
{
  "topics": ["string"],
  "concepts": ["string"],
  "definitions": [{"term": "string", "definition": "string"}],
  "formulas": [{"name": "string", "formula": "string"}],
  "suggestedQuizTopics": ["string"],
  "difficulty": "EASY" | "MEDIUM" | "HARD"
}

Return ONLY raw JSON, with no markdown backticks, code blocks, or extra text.

Educational Material:
${textSample}`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();

    let cleanedJson = rawText;
    if (cleanedJson.startsWith('```json')) cleanedJson = cleanedJson.substring(7);
    if (cleanedJson.startsWith('```')) cleanedJson = cleanedJson.substring(3);
    if (cleanedJson.endsWith('```')) cleanedJson = cleanedJson.substring(0, cleanedJson.length - 3);

    return JSON.parse(cleanedJson.trim());
  } catch (err) {
    console.error("Failed to generate educational insights:", err);
    return {
      topics: ["Inferred Subject Area"],
      concepts: ["General Concepts"],
      definitions: [],
      formulas: [],
      suggestedQuizTopics: ["Review"],
      difficulty: "MEDIUM"
    };
  }
};

module.exports = {
  extractTextPageByPage,
  generateChunks,
  generateInsights
};
