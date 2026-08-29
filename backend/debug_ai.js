/**
 * Quick diagnostic: call Gemini with a sample text and print raw output + validation result.
 * Run: node debug_ai.js
 */
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
if (!GEMINI_API_KEY) { console.error('❌ GEMINI_API_KEY is not set in .env'); process.exit(1); }

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

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
          options: { type: "array", items: { type: "string" } },
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

const sampleText = `
The operating system is responsible for managing hardware resources and providing services for computer programs.
Process scheduling determines the order in which processes are executed by the CPU.
Common scheduling algorithms include First Come First Serve (FCFS), Shortest Job First (SJF), and Round Robin.
In Round Robin scheduling, each process is given a fixed time quantum before being preempted.
`;

async function main() {
  const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

  const prompt = `Generate exactly 1 educational questions based ONLY on the provided text.
Text source: Page 1, Section: "Operating Systems".
Difficulty target: MEDIUM (use EASY, MEDIUM, or HARD for each question).
Types to include: MCQ (select from MCQ, TRUE_FALSE, SHORT_ANSWER).

Rules:
1. For MCQ, generate exactly 4 options. options array must have 4 unique strings. correctAnswer must be a string representation of the index: "0", "1", "2", or "3".
2. For TRUE_FALSE, options can be null or empty. correctAnswer must be "true" or "false".
3. For SHORT_ANSWER, options can be null or empty. correctAnswer must be the ideal short answer string.
4. Ground all questions directly in the text. Do not invent any outside facts.
5. Provide a clear explanation grounding the answer.
6. Extract the most suitable educational Topic name for each question.

Source text content:
"${sampleText}"`;

  console.log('📤 Sending request to Gemini...\n');
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  });

  const raw = result.response.text().trim();
  console.log('📥 RAW RESPONSE:\n', raw, '\n');

  let parsed;
  try {
    parsed = JSON.parse(raw);
    console.log('✅ JSON parsed OK');
  } catch(e) {
    console.error('❌ JSON parse failed:', e.message);
    process.exit(1);
  }

  if (!parsed.questions || parsed.questions.length === 0) {
    console.error('❌ No questions in parsed response');
    process.exit(1);
  }

  const q = parsed.questions[0];
  console.log('\n📋 FIRST QUESTION:');
  console.log(JSON.stringify(q, null, 2));

  // Run the same validation logic as aiService.validateQuestion
  console.log('\n🔍 VALIDATION CHECKS:');
  const type = (q.type || '').toUpperCase();
  console.log('  type:', JSON.stringify(q.type), '→ uppercased:', type);
  console.log('  questionText:', !!q.questionText);
  console.log('  correctAnswer:', JSON.stringify(q.correctAnswer));
  console.log('  topic:', JSON.stringify(q.topic));
  console.log('  difficulty:', JSON.stringify(q.difficulty));

  if (type === 'MCQ') {
    console.log('  options:', JSON.stringify(q.options));
    console.log('  options is array:', Array.isArray(q.options));
    console.log('  options.length:', Array.isArray(q.options) ? q.options.length : 'N/A');
    if (Array.isArray(q.options)) {
      const uniqueOpts = new Set(q.options.map(o => o.trim().toLowerCase()));
      console.log('  unique options count:', uniqueOpts.size);
    }
    console.log('  correctAnswer in [0,1,2,3]:', ['0','1','2','3'].includes(q.correctAnswer));
  }

  const valid =
    !!q.questionText && !!q.type && !!q.correctAnswer && !!q.topic && !!q.difficulty &&
    (type !== 'MCQ' || (Array.isArray(q.options) && q.options.length === 4 &&
      new Set(q.options.map(o=>o.trim().toLowerCase())).size === 4 &&
      ['0','1','2','3'].includes(q.correctAnswer)));

  console.log('\n' + (valid ? '✅ VALIDATION PASSED' : '❌ VALIDATION FAILED'));
}

main().catch(err => { console.error('Fatal error:', err.message); process.exit(1); });
