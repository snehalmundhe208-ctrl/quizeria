const crypto = require('crypto');
const prisma = require('../utils/prisma');

/**
 * Create a new quiz (draft status by default)
 */
exports.createQuiz = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      instructions, 
      timeLimit, 
      passingPercentage, 
      attemptsAllowed = 1,
      negativeMarking = 0.0,
      randomizeQuestions = false,
      randomizeOptions = false,
      showResultImmediately = true,
      revealAnswersAfterSubmission = true,
      mode = 'EXAM',
      useQuestionPool = false,
      poolSelectCount = null
    } = req.body;

    if (!title || !timeLimit || !passingPercentage) {
      return res.status(400).json({ error: 'Title, timeLimit, and passingPercentage are required.' });
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        instructions,
        timeLimit: parseInt(timeLimit, 10),
        passingPercentage: parseFloat(passingPercentage),
        attemptsAllowed: parseInt(attemptsAllowed, 10),
        negativeMarking: parseFloat(negativeMarking),
        randomizeQuestions,
        randomizeOptions,
        showResultImmediately,
        revealAnswersAfterSubmission,
        mode: mode || 'EXAM',
        useQuestionPool: Boolean(useQuestionPool),
        poolSelectCount: poolSelectCount ? parseInt(poolSelectCount, 10) : null,
        status: 'DRAFT',
        userId: req.user.id
      }
    });

    res.status(201).json({
      message: 'Quiz draft created successfully.',
      quiz
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ error: 'Failed to create quiz.' });
  }
};

/**
 * Retrieve all quizzes owned by educator
 */
exports.getQuizzes = async (req, res) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        quizQuestions: {
          select: { marks: true }
        },
        shareLinks: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: { attempts: true }
        }
      }
    });

    // Compute total marks and format share link
    const formatted = quizzes.map(q => {
      const totalMarks = q.quizQuestions.reduce((sum, qq) => sum + qq.marks, 0);
      const activeLink = q.shareLinks[0] || null;
      return {
        id: q.id,
        title: q.title,
        description: q.description,
        status: q.status,
        timeLimit: q.timeLimit,
        passingPercentage: q.passingPercentage,
        createdAt: q.createdAt,
        questionCount: q.quizQuestions.length,
        totalMarks,
        attemptCount: q._count.attempts,
        shareLink: activeLink ? activeLink.shareCode : null,
        shareLinkActive: activeLink ? activeLink.isActive : false
      };
    });

    res.json({ quizzes: formatted });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ error: 'Failed to retrieve quizzes.' });
  }
};

/**
 * Fetch a single quiz with its full questions list for editor
 */
exports.getQuizById = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await prisma.quiz.findFirst({
      where: { id, userId: req.user.id },
      include: {
        quizQuestions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            question: true
          }
        },
        shareLinks: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }

    res.json({ quiz });
  } catch (error) {
    console.error('Get quiz by ID error:', error);
    res.status(500).json({ error: 'Failed to retrieve quiz details.' });
  }
};

/**
 * Update quiz configurations and its questions mapping
 */
exports.updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      instructions, 
      timeLimit, 
      passingPercentage, 
      attemptsAllowed,
      negativeMarking,
      randomizeQuestions,
      randomizeOptions,
      showResultImmediately,
      revealAnswersAfterSubmission,
      mode,
      useQuestionPool,
      poolSelectCount,
      status,
      questions // Array of { questionId, marks, sortOrder }
    } = req.body;

    const quiz = await prisma.quiz.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found or unauthorized.' });
    }

    // Sync database updates
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update quiz parameters
      const q = await tx.quiz.update({
        where: { id },
        data: {
          title: title || quiz.title,
          description: description !== undefined ? description : quiz.description,
          instructions: instructions !== undefined ? instructions : quiz.instructions,
          timeLimit: timeLimit !== undefined ? parseInt(timeLimit, 10) : quiz.timeLimit,
          passingPercentage: passingPercentage !== undefined ? parseFloat(passingPercentage) : quiz.passingPercentage,
          attemptsAllowed: attemptsAllowed !== undefined ? parseInt(attemptsAllowed, 10) : quiz.attemptsAllowed,
          negativeMarking: negativeMarking !== undefined ? parseFloat(negativeMarking) : quiz.negativeMarking,
          randomizeQuestions: randomizeQuestions !== undefined ? randomizeQuestions : quiz.randomizeQuestions,
          randomizeOptions: randomizeOptions !== undefined ? randomizeOptions : quiz.randomizeOptions,
          showResultImmediately: showResultImmediately !== undefined ? showResultImmediately : quiz.showResultImmediately,
          revealAnswersAfterSubmission: revealAnswersAfterSubmission !== undefined ? revealAnswersAfterSubmission : quiz.revealAnswersAfterSubmission,
          mode: mode !== undefined ? mode : quiz.mode,
          useQuestionPool: useQuestionPool !== undefined ? Boolean(useQuestionPool) : quiz.useQuestionPool,
          poolSelectCount: poolSelectCount !== undefined ? (poolSelectCount ? parseInt(poolSelectCount, 10) : null) : quiz.poolSelectCount,
          status: status || quiz.status
        }
      });

      // 2. If questions list is supplied, sync the relation table
      if (questions && Array.isArray(questions)) {
        // Clear previous associations
        await tx.quizQuestion.deleteMany({
          where: { quizId: id }
        });

        // Insert new ones
        if (questions.length > 0) {
          const insertData = questions.map((item, idx) => ({
            quizId: id,
            questionId: item.questionId,
            marks: item.marks !== undefined ? parseFloat(item.marks) : 1.0,
            sortOrder: item.sortOrder !== undefined ? parseInt(item.sortOrder, 10) : idx
          }));

          await tx.quizQuestion.createMany({
            data: insertData
          });
        }
      }

      return q;
    });

    res.json({
      message: 'Quiz updated successfully.',
      quiz: updated
    });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ error: 'Failed to update quiz settings.' });
  }
};

/**
 * Delete a quiz
 */
exports.deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await prisma.quiz.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found or unauthorized.' });
    }

    await prisma.quiz.delete({
      where: { id }
    });

    res.json({ message: 'Quiz deleted successfully.' });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ error: 'Failed to delete quiz.' });
  }
};

/**
 * Publish quiz and generate or refresh its active share link
 */
exports.publishQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { maxAttempts = 0, expiresAt = null } = req.body;

    const quiz = await prisma.quiz.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found or unauthorized.' });
    }

    // Set status to PUBLISHED and retrieve/create share code
    const result = await prisma.$transaction(async (tx) => {
      const updatedQuiz = await tx.quiz.update({
        where: { id },
        data: { status: 'PUBLISHED' }
      });

      // Check if active share link exists
      let link = await tx.shareLink.findFirst({
        where: { quizId: id, isActive: true }
      });

      if (!link) {
        link = await tx.shareLink.create({
          data: {
            quizId: id,
            shareCode: crypto.randomUUID(),
            maxAttempts: parseInt(maxAttempts, 10),
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            isActive: true
          }
        });
      } else {
        // Update expiration and attempts limits if specified
        link = await tx.shareLink.update({
          where: { id: link.id },
          data: {
            maxAttempts: parseInt(maxAttempts, 10),
            expiresAt: expiresAt ? new Date(expiresAt) : null
          }
        });
      }

      return { quiz: updatedQuiz, shareLink: link };
    });

    res.json({
      message: 'Quiz published successfully.',
      status: 'PUBLISHED',
      shareCode: result.shareLink.shareCode,
      shareLink: result.shareLink
    });
  } catch (error) {
    console.error('Publish quiz error:', error);
    res.status(500).json({ error: 'Failed to publish quiz.' });
  }
};

/**
 * Regenerate a new random UUID share code for quiz
 */
exports.regenerateShareLink = async (req, res) => {
  try {
    const { id } = req.params;
    const { maxAttempts = 0, expiresAt = null } = req.body;

    const quiz = await prisma.quiz.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found or unauthorized.' });
    }

    const newLink = await prisma.$transaction(async (tx) => {
      // Deactivate old active links
      await tx.shareLink.updateMany({
        where: { quizId: id, isActive: true },
        data: { isActive: false }
      });

      // Create new one
      return await tx.shareLink.create({
        data: {
          quizId: id,
          shareCode: crypto.randomUUID(),
          maxAttempts: parseInt(maxAttempts, 10),
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          isActive: true
        }
      });
    });

    res.json({
      message: 'New share link generated successfully.',
      shareCode: newLink.shareCode,
      shareLink: newLink
    });
  } catch (error) {
    console.error('Regenerate share link error:', error);
    res.status(500).json({ error: 'Failed to regenerate share link.' });
  }
};

/**
 * Toggle share link active state
 */
exports.toggleShareLinkActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const quiz = await prisma.quiz.findFirst({
      where: { id, userId: req.user.id },
      include: {
        shareLinks: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!quiz || quiz.shareLinks.length === 0) {
      return res.status(404).json({ error: 'Quiz or share link not found.' });
    }

    const link = await prisma.shareLink.update({
      where: { id: quiz.shareLinks[0].id },
      data: { isActive: Boolean(isActive) }
    });

    res.json({
      message: `Share link is now ${link.isActive ? 'Active' : 'Deactivated'}.`,
      shareLink: link
    });
  } catch (error) {
    console.error('Toggle share link error:', error);
    res.status(500).json({ error: 'Failed to toggle share link status.' });
  }
};

/**
 * Student public fetch endpoint: retrieves quiz metadata and questions
 * strips correct answers and explanations to prevent cheating leaks
 */
exports.getPublicQuiz = async (req, res) => {
  try {
    const { shareCode } = req.params;

    // Fetch share code details
    const link = await prisma.shareLink.findFirst({
      where: { shareCode },
      include: {
        quiz: {
          include: {
            quizQuestions: {
              orderBy: { sortOrder: 'asc' },
              include: {
                question: true
              }
            }
          }
        }
      }
    });

    // Uniform security error: do not leak draft status vs expired vs active
    if (!link || !link.isActive || link.quiz.status !== 'PUBLISHED') {
      return res.status(404).json({ error: 'Quiz not available.' });
    }

    // Expiry check
    if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
      return res.status(404).json({ error: 'Quiz not available.' });
    }

    const quiz = link.quiz;

    // Build stripped questions array (no correctAnswer, no explanation)
    const questions = quiz.quizQuestions.map(qq => {
      const q = qq.question;
      return {
        id: q.id,
        type: q.type,
        questionText: q.questionText,
        options: q.options || null,
        difficulty: q.difficulty,
        topic: q.topic,
        marks: qq.marks
      };
    });

    res.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        instructions: quiz.instructions,
        timeLimit: quiz.timeLimit,
        attemptsAllowed: quiz.attemptsAllowed,
        negativeMarking: quiz.negativeMarking,
        randomizeQuestions: quiz.randomizeQuestions,
        randomizeOptions: quiz.randomizeOptions,
        showResultImmediately: quiz.showResultImmediately,
        revealAnswersAfterSubmission: quiz.revealAnswersAfterSubmission
      },
      questions,
      maxAttempts: link.maxAttempts,
      expiresAt: link.expiresAt
    });
  } catch (error) {
    console.error('Fetch public quiz error:', error);
    res.status(500).json({ error: 'An error occurred fetching quiz details.' });
  }
};
