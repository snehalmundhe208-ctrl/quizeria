const { GoogleGenerativeAI } = require('@google/generative-ai');
const aiConfig = require('../config/aiConfig');

const genAI = new GoogleGenerativeAI(aiConfig.GEMINI_API_KEY);

const responseSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          questionText: { type: "string" },
          type: { type: "string", enum: ["MCQ", "TRUE_FALSE", "SHORT_ANSWER"] },
          options: {
            type: "array",
            items: { type: "string" }
          },
          correctAnswer: { type: "string" },
          explanation: { type: "string" },
          difficulty: { type: "string", enum: ["EASY", "MEDIUM", "HARD"] },
          topic: { type: "string" }
        },
        required: ["questionText", "type", "correctAnswer", "explanation", "difficulty", "topic"]
      }
    }
  },
  required: ["questions"]
};

class GeminiProvider {
  /**
   * Generates questions based on a chunk of text
   */
  async generateQuestions(chunkText, config) {
    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API key is not configured.");
    }

    const { count, difficulty, types = ['MCQ'], pageNumber, sectionTitle } = config;
    const finalTypes = Array.isArray(types) ? types : [types];
    const model = genAI.getGenerativeModel({ model: aiConfig.GEMINI_MODEL });

    const prompt = `Generate exactly ${count} educational questions based ONLY on the provided text.
Text source: Page ${pageNumber}, Section: "${sectionTitle}".
Difficulty target: ${difficulty} (use EASY, MEDIUM, or HARD for each question).
Types to include: ${finalTypes.join(', ')} (select from MCQ, TRUE_FALSE, SHORT_ANSWER).

Rules:
1. For MCQ, generate exactly 4 options. options array must have 4 unique strings. correctAnswer must be a string representation of the index: "0", "1", "2", or "3".
2. For TRUE_FALSE, options can be null or empty. correctAnswer must be "true" or "false".
3. For SHORT_ANSWER, options can be null or empty. correctAnswer must be the ideal short answer string.
4. Ground all questions directly in the text. Do not invent any outside facts.
5. Provide a clear explanation grounding the answer.
6. Extract the most suitable educational Topic name for each question.

Source text content:
"${chunkText}"`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    const rawResponse = result.response.text().trim();
    let parsed;
    try {
      parsed = JSON.parse(rawResponse);
    } catch (parseErr) {
      // JSON repair helper if needed
      let cleaned = rawResponse;
      if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
      if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);
      parsed = JSON.parse(cleaned.trim());
    }

    // Map source page & section references
    if (parsed && parsed.questions) {
      parsed.questions = parsed.questions.map(q => ({
        ...q,
        sourcePage: pageNumber,
        sourceSection: sectionTitle
      }));
    }

    return parsed.questions || [];
  }

  /**
   * Generates an explanation for a given question
   */
  async generateExplanation(questionText, correctAnswer) {
    const model = genAI.getGenerativeModel({ model: aiConfig.GEMINI_MODEL });
    const prompt = `Provide a concise, grounded explanation for why the answer "${correctAnswer}" is correct for this question:\n"${questionText}"`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }

  /**
   * Validation layer to check schemas
   */
  validateQuestion(q) {
    if (!q.questionText || !q.type || !q.correctAnswer || !q.topic || !q.difficulty) {
      return false;
    }

    const type = q.type.toUpperCase();
    if (type === 'MCQ') {
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        return false;
      }
      // Ensure unique options
      const uniqueOpts = new Set(q.options.map(o => o.trim().toLowerCase()));
      if (uniqueOpts.size !== 4) {
        return false;
      }
      // Correct answer must be index "0", "1", "2", "3"
      if (!['0', '1', '2', '3'].includes(q.correctAnswer)) {
        return false;
      }
    } else if (type === 'TRUE_FALSE') {
      if (q.correctAnswer.toLowerCase() !== 'true' && q.correctAnswer.toLowerCase() !== 'false') {
        return false;
      }
    } else if (type === 'SHORT_ANSWER') {
      if (q.correctAnswer.trim().length === 0) {
        return false;
      }
    } else {
      return false;
    }

    return true;
  }

  /**
   * Evaluates AI Question Quality score (0-100) and detects warnings
   */
  evaluateQuestionQuality(q) {
    let score = 100;
    const warnings = [];

    if (!q.questionText || q.questionText.trim().length < 15) {
      score -= 25;
      warnings.push("Question text is very short or ambiguous.");
    }

    if (!q.explanation || q.explanation.trim().length < 20) {
      score -= 15;
      warnings.push("Explanation is minimal or missing.");
    }

    const type = (q.type || '').toUpperCase();
    if (type === 'MCQ') {
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        score -= 30;
        warnings.push("MCQ must have exactly 4 options.");
      } else {
        const lengths = q.options.map(o => o.trim().length);
        const minLen = Math.min(...lengths);
        const maxLen = Math.max(...lengths);
        if (minLen < 2) {
          score -= 10;
          warnings.push("One or more options are extremely short.");
        }
        if (maxLen > minLen * 4 && maxLen > 80) {
          score -= 10;
          warnings.push("Unbalanced option lengths (the correct answer may stand out).");
        }
      }
    } else if (type === 'SHORT_ANSWER') {
      if (!q.correctAnswer || q.correctAnswer.trim().length < 10) {
        score -= 20;
        warnings.push("Reference short answer could be more detailed.");
      }
    }

    if (!q.sourcePage && !q.sourceSection) {
      score -= 10;
      warnings.push("Missing direct page/section grounding metadata.");
    }

    const finalScore = Math.max(40, Math.min(100, score));

    return {
      qualityScore: finalScore,
      warnings
    };
  }
}

// Map of AI Providers to support easy switching later
const providers = {
  gemini: new GeminiProvider()
};

const activeProvider = process.env.AI_PROVIDER || 'gemini';
module.exports = providers[activeProvider];
