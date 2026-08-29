const prisma = require('../utils/prisma');
const aiService = require('../services/aiService');

/**
 * Generate a new Question Paper based on a section blueprint
 */
exports.generatePaper = async (req, res) => {
  try {
    const { 
      documentId, 
      title, 
      subject, 
      durationMinutes, 
      totalMarks, 
      instructions, 
      blueprint // Array of sections: { id, name, type, count, marksPerQuestion }
    } = req.body;

    if (!documentId || !title || !subject || !blueprint || !Array.isArray(blueprint)) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    // 1. Validate total marks against sections sum
    const calculatedSum = blueprint.reduce((sum, s) => sum + (s.count * s.marksPerQuestion), 0);
    if (Math.abs(calculatedSum - parseFloat(totalMarks)) > 0.01) {
      return res.status(400).json({ 
        error: `Total marks mismatch. Blueprint calculates to ${calculatedSum} marks, but totalMarks was set to ${totalMarks}.` 
      });
    }

    // Fetch document chunks in case we need AI generation fallback
    const chunks = await prisma.documentChunk.findMany({
      where: { documentId }
    });

    const selectedQuestionIds = []; // Track already selected questions
    const sectionsMapping = [];     // Array of { sectionId, questionId, marks }

    for (const section of blueprint) {
      // 2. Fetch matching questions from database bank
      let bankQuestions = await prisma.question.findMany({
        where: {
          documentId,
          type: section.type,
          id: { notIn: selectedQuestionIds }
        }
      });

      // 3. Fallback: generate questions via AI if not enough matching ones exist
      if (bankQuestions.length < section.count) {
        const needed = section.count - bankQuestions.length;
        console.log(`Fallback: Generating ${needed} new ${section.type} questions for paper sections...`);
        
        // Randomly pick chunks to supply context
        const sampleChunks = chunks.length > 0 
          ? Array.from({ length: Math.min(chunks.length, needed) }, () => chunks[Math.floor(Math.random() * chunks.length)])
          : [];

        for (let i = 0; i < needed; i++) {
          try {
            const chunk = sampleChunks[i % sampleChunks.length] || { content: "General content", pageNumber: 1, sectionHeader: "Intro" };
            // Generate a single question matching type
            const generated = await aiService.generateQuestions(
              chunk.content,
              1,
              section.type,
              'MEDIUM'
            );

            if (generated && generated.length > 0) {
              const q = generated[0];
              // Save to database question bank
              const saved = await prisma.question.create({
                data: {
                  documentId,
                  chunkId: chunk.id || null,
                  type: section.type,
                  questionText: q.questionText,
                  options: q.options || null,
                  correctAnswer: q.correctAnswer,
                  explanation: q.explanation || "",
                  difficulty: q.difficulty || "MEDIUM",
                  topic: q.topic || "General",
                  sourcePage: chunk.pageNumber || null,
                  sourceSection: chunk.sectionHeader || null
                }
              });
              bankQuestions.push(saved);
            }
          } catch (aiErr) {
            console.error("AI section question generation fallback error:", aiErr);
          }
        }
      }

      // Respect topic/difficulty weights if specified, otherwise sample
      // For now, take the first N questions up to count
      const chosen = bankQuestions.slice(0, section.count);
      chosen.forEach((q, idx) => {
        selectedQuestionIds.push(q.id);
        sectionsMapping.push({
          questionId: q.id,
          sectionId: section.name,
          marks: section.marksPerQuestion,
          sortOrder: idx
        });
      });
    }

    // 4. Save question paper in transaction
    const paper = await prisma.$transaction(async (tx) => {
      const p = await tx.questionPaper.create({
        data: {
          title,
          subject,
          durationMinutes: parseInt(durationMinutes, 10),
          totalMarks: parseFloat(totalMarks),
          instructions,
          blueprint: blueprint, // store blueprint config
          sections: blueprint,   // store configurations list
          userId: req.user.id
        }
      });

      const paperQuestionsData = sectionsMapping.map(item => ({
        questionPaperId: p.id,
        questionId: item.questionId,
        sectionId: item.sectionId,
        marks: item.marks,
        sortOrder: item.sortOrder
      }));

      await tx.questionPaperQuestion.createMany({
        data: paperQuestionsData
      });

      return p;
    });

    res.status(201).json({
      message: 'Question paper generated successfully.',
      paperId: paper.id
    });
  } catch (error) {
    console.error('Generate paper error:', error);
    res.status(500).json({ error: 'Failed to generate question paper blueprint.' });
  }
};

/**
 * Retrieve all question papers owned by administrator
 */
exports.getPapers = async (req, res) => {
  try {
    const papers = await prisma.questionPaper.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });

    res.json({ papers });
  } catch (error) {
    console.error('Get papers error:', error);
    res.status(500).json({ error: 'Failed to retrieve question papers.' });
  }
};

/**
 * Fetch detailed paper questions roster
 */
exports.getPaperById = async (req, res) => {
  try {
    const { id } = req.params;

    const paper = await prisma.questionPaper.findFirst({
      where: { id, userId: req.user.id },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            question: true
          }
        }
      }
    });

    if (!paper) {
      return res.status(404).json({ error: 'Question paper not found.' });
    }

    res.json({ paper });
  } catch (error) {
    console.error('Get paper by ID error:', error);
    res.status(500).json({ error: 'Failed to retrieve question paper details.' });
  }
};

/**
 * Update question paper questions mapping lists (swap/reorder)
 */
exports.updatePaper = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject, durationMinutes, instructions, questions } = req.body;

    const paper = await prisma.questionPaper.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!paper) {
      return res.status(404).json({ error: 'Question paper not found or unauthorized.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.questionPaper.update({
        where: { id },
        data: {
          title: title || paper.title,
          subject: subject || paper.subject,
          durationMinutes: durationMinutes !== undefined ? parseInt(durationMinutes, 10) : paper.durationMinutes,
          instructions: instructions !== undefined ? instructions : paper.instructions
        }
      });

      if (questions && Array.isArray(questions)) {
        // Clear previous associations
        await tx.questionPaperQuestion.deleteMany({
          where: { questionPaperId: id }
        });

        const insertData = questions.map((item, idx) => ({
          questionPaperId: id,
          questionId: item.questionId,
          sectionId: item.sectionId,
          marks: parseFloat(item.marks),
          sortOrder: item.sortOrder !== undefined ? parseInt(item.sortOrder, 10) : idx
        }));

        await tx.questionPaperQuestion.createMany({
          data: insertData
        });
      }

      return p;
    });

    res.json({
      message: 'Question paper updated successfully.',
      paper: updated
    });
  } catch (error) {
    console.error('Update paper error:', error);
    res.status(500).json({ error: 'Failed to update question paper.' });
  }
};

/**
 * Delete a question paper
 */
exports.deletePaper = async (req, res) => {
  try {
    const { id } = req.params;

    const paper = await prisma.questionPaper.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!paper) {
      return res.status(404).json({ error: 'Question paper not found or unauthorized.' });
    }

    await prisma.questionPaper.delete({
      where: { id }
    });

    res.json({ message: 'Question paper deleted successfully.' });
  } catch (error) {
    console.error('Delete paper error:', error);
    res.status(500).json({ error: 'Failed to delete question paper.' });
  }
};

/**
 * Regenerate questions for a specific section
 */
exports.regenerateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { sectionId, documentId } = req.body;

    const paper = await prisma.questionPaper.findFirst({
      where: { id, userId: req.user.id },
      include: { questions: true }
    });

    if (!paper) {
      return res.status(404).json({ error: 'Question paper not found.' });
    }

    // Find section details from blueprint
    const blueprint = paper.blueprint;
    const section = blueprint.find(s => s.name === sectionId);

    if (!section) {
      return res.status(400).json({ error: 'Section not found in blueprint.' });
    }

    // Fetch all non-selected questions in other sections
    const nonSelectedQuestions = paper.questions.filter(q => q.sectionId !== sectionId);
    const excludeIds = nonSelectedQuestions.map(q => q.questionId);

    // Fetch matching questions from bank
    let bankQuestions = await prisma.question.findMany({
      where: {
        documentId,
        type: section.type,
        id: { notIn: excludeIds }
      }
    });

    // If not enough questions, generate new ones
    if (bankQuestions.length < section.count) {
      const needed = section.count - bankQuestions.length;
      const chunks = await prisma.documentChunk.findMany({ where: { documentId } });
      const sampleChunks = chunks.length > 0 
        ? Array.from({ length: Math.min(chunks.length, needed) }, () => chunks[Math.floor(Math.random() * chunks.length)])
        : [];

      for (let i = 0; i < needed; i++) {
        try {
          const chunk = sampleChunks[i % sampleChunks.length] || { content: "General Content", pageNumber: 1, sectionHeader: "Intro" };
          const generated = await aiService.generateQuestions(chunk.content, 1, section.type, 'MEDIUM');
          if (generated && generated.length > 0) {
            const q = generated[0];
            const saved = await prisma.question.create({
              data: {
                documentId,
                chunkId: chunk.id || null,
                type: section.type,
                questionText: q.questionText,
                options: q.options || null,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation || "",
                difficulty: "MEDIUM",
                topic: q.topic || "General",
                sourcePage: chunk.pageNumber || null,
                sourceSection: chunk.sectionHeader || null
              }
            });
            bankQuestions.push(saved);
          }
        } catch (aiErr) {
          console.error(aiErr);
        }
      }
    }

    // Swap questions inside the section in a transaction
    const chosen = bankQuestions.slice(0, section.count);

    await prisma.$transaction(async (tx) => {
      // Clear current questions for this section
      await tx.questionPaperQuestion.deleteMany({
        where: { questionPaperId: id, sectionId }
      });

      // Insert new ones
      const insertData = chosen.map((q, idx) => ({
        questionPaperId: id,
        questionId: q.id,
        sectionId,
        marks: section.marksPerQuestion,
        sortOrder: idx
      }));

      await tx.questionPaperQuestion.createMany({
        data: insertData
      });
    });

    res.json({ message: `Section "${sectionId}" successfully regenerated.` });
  } catch (error) {
    console.error('Regenerate section error:', error);
    res.status(500).json({ error: 'Failed to regenerate section questions.' });
  }
};

/**
 * stand-alone Academic print exporter
 * outputs HTML page styled cleanly for A4 printing (window.print() friendly)
 */
exports.exportPaperHtml = async (req, res) => {
  try {
    const { id } = req.params;
    let { mode = 'student' } = req.query; // 'student' or 'answer_key'

    // CRITICAL SECURITY FIX: prevent mode=answer_key without admin session
    if (mode === 'answer_key' && !req.user) {
      return res.status(403).send('<h1>403 Forbidden</h1><p>Authentication required to view answer key.</p>');
    }

    const paper = await prisma.questionPaper.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            question: true
          }
        }
      }
    });

    if (!paper) {
      return res.status(404).send('<h1>Question Paper Not Found</h1>');
    }

    // Ownership check for authenticated requests
    if (req.user && paper.userId !== req.user.id) {
      return res.status(403).send('<h1>403 Forbidden</h1><p>Unauthorized to access this question paper.</p>');
    }

    // Group questions by sections
    const sectionsData = {};
    paper.questions.forEach(q => {
      const secId = q.sectionId;
      if (!sectionsData[secId]) {
        sectionsData[secId] = [];
      }
      sectionsData[secId].push(q);
    });

    // Render HTML page
    const isAnswerKey = mode === 'answer_key';

    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${paper.title} - ${isAnswerKey ? 'Answer Key' : 'Question Paper'}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @media print {
          body { background: white; color: black; font-family: "Times New Roman", Times, serif; }
          .no-print { display: none; }
          .page-break { page-break-after: always; }
          @page { size: A4; margin: 20mm; }
        }
        body { font-family: "Times New Roman", Times, serif; }
      </style>
    </head>
    <body class="bg-white text-black p-8 max-w-4xl mx-auto space-y-8">
      
      <!-- PRINT CONTROLS -->
      <div class="no-print bg-slate-100 border border-slate-200 p-4 rounded-xl flex justify-between items-center mb-8">
        <div>
          <span class="text-xs font-semibold text-slate-500 uppercase">Print Preview - Mode: <strong class="text-slate-800">${mode.toUpperCase()}</strong></span>
          <p className="text-xs text-slate-500">For best results, enable headers/footers in the print dialog to see page numbers.</p>
        </div>
        <button onclick="window.print()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow transition-colors">
          Print to PDF / Paper
        </button>
      </div>

      <!-- HEADER BANNER -->
      <div class="text-center space-y-2 border-b-2 border-black pb-4">
        ${isAnswerKey ? '<h3 class="text-red-650 text-red-650 font-bold uppercase tracking-wider text-sm text-red-650">*** ANSWER KEY - FOR ADMIN USE ONLY ***</h3>' : ''}
        <h1 class="text-2xl font-bold uppercase">StudyForge AI Academy</h1>
        <h2 class="text-xl font-bold">${paper.subject}</h2>
        <h3 class="text-md font-semibold">${paper.title}</h3>
        
        <div class="flex justify-between items-center text-xs font-bold pt-4">
          <span>Duration: ${paper.durationMinutes} Minutes</span>
          <span>Date: ${new Date(paper.createdAt).toLocaleDateString()}</span>
          <span>Max Marks: ${paper.totalMarks} Marks</span>
        </div>
      </div>

      <!-- INSTRUCTIONS -->
      {INSTRUCTIONS_SECTION}

      <!-- SECTIONS -->
      {SECTIONS_CONTENT}

    </body>
    </html>
    `;

    const instructionsText = paper.instructions 
      ? `<div class="text-xs leading-relaxed border border-black p-3 rounded">
           <strong class="block mb-1">Instructions:</strong>
           <p class="whitespace-pre-line">${paper.instructions}</p>
         </div>`
      : '';

    html = html.replace('{INSTRUCTIONS_SECTION}', instructionsText);

    // Build sections html
    let sectionsHtml = '';
    const sectionKeys = Object.keys(sectionsData);

    sectionKeys.forEach((secName, secIdx) => {
      const qList = sectionsData[secName];
      const sectionTotal = qList.reduce((sum, q) => sum + q.marks, 0);
      
      sectionsHtml += `
      <div class="space-y-4 pt-4">
        <h2 class="text-lg font-bold border-b border-black pb-1 uppercase flex justify-between">
          <span>${secName}</span>
          <span class="text-xs font-semibold">(${sectionTotal} Marks)</span>
        </h2>
        
        <div class="space-y-5">
      `;

      qList.forEach((qItem, qIdx) => {
        const q = qItem.question;
        sectionsHtml += `
          <div class="text-sm space-y-2">
            <div class="flex justify-between items-start gap-4">
              <span className="leading-relaxed">
                <strong>Q${qIdx + 1}.</strong> ${q.questionText}
              </span>
              <span class="font-mono text-xs font-bold italic shrink-0">(${qItem.marks} Marks)</span>
            </div>
        `;

        // Render options if MCQ
        if (q.type === 'MCQ' && q.options) {
          sectionsHtml += `<div class="grid grid-cols-2 gap-2 pl-6 mt-1.5">`;
          q.options.forEach((opt, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx);
            sectionsHtml += `<div class="text-xs">(${letter}) ${opt}</div>`;
          });
          sectionsHtml += `</div>`;
        }

        // Render answers/explanations if answer_key mode
        if (isAnswerKey) {
          let ansText = q.correctAnswer;
          if (q.type === 'MCQ') {
            const idx = parseInt(q.correctAnswer, 10);
            ansText = `(${String.fromCharCode(65 + idx)}) ${q.options[idx]}`;
          }

          sectionsHtml += `
            <div class="mt-2 pl-4 border-l-2 border-slate-400 bg-slate-50 p-2 text-xs space-y-1">
              <p><strong class="text-slate-800">Correct Answer:</strong> <span class="font-bold text-emerald-700">${ansText}</span></p>
              ${q.explanation ? `<p><strong class="text-slate-800">Explanation:</strong> <span class="text-slate-650">${q.explanation}</span></p>` : ''}
            </div>
          `;
        }

        sectionsHtml += `</div>`; // Close question box
      });

      sectionsHtml += `
        </div>
      </div>
      `;

      // Page break after section if it's not the last section (clean formatting)
      if (secIdx < sectionKeys.length - 1) {
        sectionsHtml += `<div class="page-break"></div>`;
      }
    });

    html = html.replace('{SECTIONS_CONTENT}', sectionsHtml);
    res.send(html);
  } catch (error) {
    console.error('Export HTML error:', error);
    res.status(500).send('<h1>Failed to export PDF layout.</h1>');
  }
};
