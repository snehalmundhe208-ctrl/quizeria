const prisma = require('../utils/prisma');

/**
 * Reusable grading and auto-evaluation logic
 * Evaluates MCQ and True/False immediately, leaves short answers pending if present
 */
const finalizeAndScoreAttempt = async (attemptId, submitTimeOverride = null) => {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          quizQuestions: {
            include: { question: true }
          }
        }
      }
    }
  });

  if (!attempt || attempt.status !== 'STARTED') {
    return attempt;
  }

  const submitTime = submitTimeOverride || new Date();
  const startTimeMs = attempt.startTime.getTime();
  const timeLimitMs = attempt.quiz.timeLimit * 60 * 1000;
  const elapsedSeconds = Math.floor((submitTime.getTime() - startTimeMs) / 1000);

  // Fetch all saved answers
  const savedAnswers = await prisma.attemptAnswer.findMany({
    where: { attemptId }
  });

  const quizQuestions = attempt.quiz.quizQuestions;
  
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;
  let hasShortAnswers = false;

  const evaluationUpdates = [];

  for (const qq of quizQuestions) {
    const q = qq.question;
    const studentAnswer = savedAnswers.find(sa => sa.questionId === q.id);
    const answerVal = studentAnswer ? studentAnswer.answer.trim() : '';

    let isCorrect = false;
    let marksObtained = 0.0;
    let reviewed = true;

    if (q.type === 'MCQ') {
      if (!answerVal) {
        unansweredCount++;
        isCorrect = false;
        marksObtained = 0.0;
      } else {
        const correctIndex = parseInt(q.correctAnswer, 10);
        const correctOptionText = q.options[correctIndex];

        if (answerVal === correctOptionText) {
          correctCount++;
          isCorrect = true;
          marksObtained = qq.marks;
        } else {
          wrongCount++;
          isCorrect = false;
          marksObtained = -attempt.quiz.negativeMarking;
        }
      }
    } else if (q.type === 'TRUE_FALSE') {
      if (!answerVal) {
        unansweredCount++;
        isCorrect = false;
        marksObtained = 0.0;
      } else {
        if (answerVal.toLowerCase() === q.correctAnswer.toLowerCase()) {
          correctCount++;
          isCorrect = true;
          marksObtained = qq.marks;
        } else {
          wrongCount++;
          isCorrect = false;
          marksObtained = -attempt.quiz.negativeMarking;
        }
      }
    } else if (q.type === 'SHORT_ANSWER') {
      hasShortAnswers = true;
      reviewed = false;
      isCorrect = null;
      marksObtained = null;
      if (!answerVal) {
        unansweredCount++;
      }
    }

    evaluationUpdates.push({
      questionId: q.id,
      answer: answerVal,
      isCorrect,
      marksObtained,
      reviewed
    });
  }

  // Write evaluated answers to database
  await prisma.$transaction(async (tx) => {
    for (const item of evaluationUpdates) {
      await tx.attemptAnswer.upsert({
        where: {
          attemptId_questionId: {
            attemptId,
            questionId: item.questionId
          }
        },
        update: {
          isCorrect: item.isCorrect,
          marksObtained: item.marksObtained,
          reviewed: item.reviewed
        },
        create: {
          attemptId,
          questionId: item.questionId,
          answer: item.answer,
          isCorrect: item.isCorrect,
          marksObtained: item.marksObtained,
          reviewed: item.reviewed
        }
      });
    }
  });

  // Calculate score & percentage (MCQ/TF only initially)
  const score = evaluationUpdates.reduce((sum, item) => {
    const q = quizQuestions.find(qq => qq.questionId === item.questionId);
    if (q && q.question.type !== 'SHORT_ANSWER' && item.marksObtained) {
      return sum + item.marksObtained;
    }
    return sum;
  }, 0);

  const autoGradedPossibleMarks = quizQuestions
    .filter(qq => qq.question.type !== 'SHORT_ANSWER')
    .reduce((sum, qq) => sum + qq.marks, 0);

  const percentage = autoGradedPossibleMarks > 0 
    ? (score / autoGradedPossibleMarks) * 100 
    : 0.0;

  const passed = percentage >= attempt.quiz.passingPercentage;
  const finalStatus = hasShortAnswers ? 'UNDER_REVIEW' : 'COMPLETED';

  return await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      submitTime,
      score,
      percentage,
      passed: hasShortAnswers ? false : passed,
      durationSeconds: Math.max(0, elapsedSeconds),
      status: finalStatus
    }
  });
};

/**
 * Background Cleanup: Auto submits STARTED attempts past their time limits + grace buffer
 */
const cleanupStaleAttempts = async (userId) => {
  try {
    const now = new Date();
    
    // Find all STARTED attempts for this admin's quizzes
    const staleAttempts = await prisma.attempt.findMany({
      where: {
        status: 'STARTED',
        quiz: { userId }
      },
      include: { quiz: true }
    });

    for (const attempt of staleAttempts) {
      const timeLimitMs = attempt.quiz.timeLimit * 60 * 1000;
      const expiresAt = new Date(attempt.startTime.getTime() + timeLimitMs);
      
      // If past expiresAt + 10s grace
      if (now.getTime() > expiresAt.getTime() + 10000) {
        console.log(`Auto-finalizing stale attempt ID: ${attempt.id}`);
        await finalizeAndScoreAttempt(attempt.id, expiresAt);
      }
    }
  } catch (err) {
    console.error("Stale attempt cleanup error:", err);
  }
};

/**
 * Start a student quiz attempt
 */
exports.startAttempt = async (req, res) => {
  try {
    const { shareCode } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: req.user.id }
    });

    if (!student) {
      return res.status(403).json({ error: 'Only registered students can take quizzes.' });
    }

    const link = await prisma.shareLink.findFirst({
      where: { shareCode, isActive: true },
      include: {
        quiz: {
          include: {
            quizQuestions: {
              orderBy: { sortOrder: 'asc' },
              include: { question: true }
            }
          }
        }
      }
    });

    if (!link || link.quiz.status !== 'PUBLISHED') {
      return res.status(404).json({ error: 'Quiz not available.' });
    }

    if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
      return res.status(404).json({ error: 'Quiz not available.' });
    }

    const quiz = link.quiz;

    // Enforce limits
    const pastAttemptsCount = await prisma.attempt.count({
      where: {
        quizId: quiz.id,
        studentId: student.id,
        status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'COMPLETED'] }
      }
    });

    if (pastAttemptsCount >= quiz.attemptsAllowed) {
      return res.status(400).json({ error: `Attempt limit exceeded. Maximum attempts: ${quiz.attemptsAllowed}.` });
    }

    let activeAttempt = await prisma.attempt.findFirst({
      where: {
        quizId: quiz.id,
        studentId: student.id,
        status: 'STARTED'
      }
    });

    if (!activeAttempt) {
      activeAttempt = await prisma.attempt.create({
        data: {
          quizId: quiz.id,
          studentId: student.id,
          startTime: new Date(),
          status: 'STARTED'
        }
      });
    }

    const expiresAt = new Date(activeAttempt.startTime.getTime() + quiz.timeLimit * 60 * 1000);

    let quizQuestionsList = quiz.quizQuestions;
    if (quiz.useQuestionPool && quiz.poolSelectCount > 0 && quiz.poolSelectCount < quizQuestionsList.length) {
      quizQuestionsList = shuffleArray(quizQuestionsList).slice(0, quiz.poolSelectCount);
    } else if (quiz.randomizeQuestions) {
      quizQuestionsList = shuffleArray(quizQuestionsList);
    }

    const formattedQuestions = quizQuestionsList.map(qq => {
      const q = qq.question;
      let options = q.options;
      if (q.type === 'MCQ' && q.options && quiz.randomizeOptions) {
        options = shuffleArray(q.options);
      }

      return {
        id: q.id,
        type: q.type,
        questionText: q.questionText,
        options,
        difficulty: q.difficulty,
        topic: q.topic,
        marks: qq.marks
      };
    });

    res.json({
      attemptId: activeAttempt.id,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        instructions: quiz.instructions,
        timeLimit: quiz.timeLimit,
        negativeMarking: quiz.negativeMarking
      },
      questions: formattedQuestions,
      expiresAt: expiresAt.toISOString(),
      student: {
        name: student.name,
        studentId: student.studentId
      }
    });
  } catch (error) {
    console.error('Start attempt error:', error);
    res.status(500).json({ error: 'Failed to start quiz attempt.' });
  }
};

/**
 * Periodically auto-save student answers
 */
exports.saveAnswers = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers must be an array.' });
    }

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: { quiz: true }
    });

    if (!attempt || attempt.status !== 'STARTED') {
      return res.status(404).json({ error: 'Active attempt not found.' });
    }

    if (attempt.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to save answers for this attempt.' });
    }

    const now = new Date();
    const timeLimitMs = attempt.quiz.timeLimit * 60 * 1000;
    const isExpired = now.getTime() > (attempt.startTime.getTime() + timeLimitMs + 10000);

    if (isExpired) {
      return res.status(400).json({ error: 'Time has expired.' });
    }

    await prisma.$transaction(async (tx) => {
      for (const item of answers) {
        if (!item.questionId || item.answer === undefined) continue;

        await tx.attemptAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId,
              questionId: item.questionId
            }
          },
          update: { answer: String(item.answer) },
          create: {
            attemptId,
            questionId: item.questionId,
            answer: String(item.answer)
          }
        });
      }
    });

    res.json({ message: 'Progress saved successfully.' });
  } catch (error) {
    console.error('Save answers error:', error);
    res.status(500).json({ error: 'Failed to save progress.' });
  }
};

/**
 * Submit attempt
 */
exports.submitAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers = [] } = req.body;

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: { quiz: true }
    });

    if (!attempt || attempt.status !== 'STARTED') {
      return res.status(404).json({ error: 'Active attempt not found.' });
    }

    if (attempt.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to submit this attempt.' });
    }

    const now = new Date();
    const timeLimitMs = attempt.quiz.timeLimit * 60 * 1000;
    const isExpiredPastGrace = now.getTime() > (attempt.startTime.getTime() + timeLimitMs + 10000);

    // Save final answers payload if within time limits
    if (!isExpiredPastGrace && answers.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const item of answers) {
          if (!item.questionId || item.answer === undefined) continue;
          await tx.attemptAnswer.upsert({
            where: {
              attemptId_questionId: {
                attemptId,
                questionId: item.questionId
              }
            },
            update: { answer: String(item.answer) },
            create: {
              attemptId,
              questionId: item.questionId,
              answer: String(item.answer)
            }
          });
        }
      });
    }

    const updated = await finalizeAndScoreAttempt(attemptId, now);
    res.json({
      message: 'Attempt submitted successfully.',
      attempt: {
        id: updated.id,
        score: updated.score,
        percentage: updated.percentage,
        passed: updated.passed,
        status: updated.status,
        durationSeconds: updated.durationSeconds
      }
    });
  } catch (error) {
    console.error('Submit attempt error:', error);
    res.status(500).json({ error: 'Failed to evaluate attempt.' });
  }
};

/**
 * Fetch scorecard results
 */
exports.getAttemptResult = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        student: true,
        quiz: {
          include: {
            quizQuestions: {
              include: { question: true }
            }
          }
        },
        answers: {
          include: { question: true }
        }
      }
    });

    if (!attempt || attempt.status === 'STARTED') {
      return res.status(404).json({ error: 'Attempt result not available.' });
    }

    if (attempt.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to view this attempt result.' });
    }

    const quiz = attempt.quiz;
    const revealAnswers = quiz.revealAnswersAfterSubmission;

    const processedAnswers = attempt.answers.map(ans => {
      const q = ans.question;
      const qq = quiz.quizQuestions.find(item => item.questionId === q.id);

      const response = {
        questionId: q.id,
        type: q.type,
        questionText: q.questionText,
        options: q.options,
        studentAnswer: ans.answer,
        isCorrect: ans.isCorrect,
        marksObtained: ans.marksObtained,
        maxMarks: qq ? qq.marks : 1.0,
        reviewed: ans.reviewed,
        topic: q.topic
      };

      if (revealAnswers) {
        if (q.type === 'MCQ') {
          const idx = parseInt(q.correctAnswer, 10);
          response.correctAnswer = q.options[idx];
        } else {
          response.correctAnswer = q.correctAnswer;
        }
        response.explanation = q.explanation;
      }

      return response;
    });

    res.json({
      attempt: {
        id: attempt.id,
        status: attempt.status,
        score: attempt.score,
        percentage: attempt.percentage,
        passed: attempt.passed,
        durationSeconds: attempt.durationSeconds,
        submitTime: attempt.submitTime
      },
      student: {
        name: attempt.student.name,
        studentId: attempt.student.studentId
      },
      quiz: {
        title: quiz.title,
        description: quiz.description,
        passingPercentage: quiz.passingPercentage,
        revealAnswers
      },
      answers: processedAnswers
    });
  } catch (error) {
    console.error('Get result error:', error);
    res.status(500).json({ error: 'Failed to retrieve assessment results.' });
  }
};

/**
 * Synced answers loader
 */
exports.loadAttemptAnswers = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId }
    });

    if (!attempt || attempt.status !== 'STARTED') {
      return res.status(404).json({ error: 'Active attempt not found.' });
    }

    if (attempt.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to load answers for this attempt.' });
    }

    const answers = await prisma.attemptAnswer.findMany({
      where: { attemptId },
      select: { questionId: true, answer: true }
    });

    res.json({ answers });
  } catch (error) {
    console.error('Load answers error:', error);
    res.status(500).json({ error: 'Failed to load attempt progress.' });
  }
};

/**
 * Retrieve attempts list for teacher dashboard (incorporates stale cleanup)
 */
exports.getAttemptsForAdmin = async (req, res) => {
  try {
    // 1. Invoke background stale attempts cleanup first!
    await cleanupStaleAttempts(req.user.id);

    const { quizId, status, search } = req.query;

    const where = {
      quiz: {
        userId: req.user.id
      }
    };

    if (quizId) where.quizId = quizId;
    if (status) where.status = status;
    if (search) {
      where.student = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { studentId: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const attempts = await prisma.attempt.findMany({
      where,
      orderBy: { submitTime: 'desc' },
      include: {
        student: true,
        quiz: {
          select: { title: true, quizQuestions: { select: { marks: true } } }
        }
      }
    });

    const formatted = attempts.map(att => {
      const maxMarks = att.quiz.quizQuestions.reduce((sum, qq) => sum + qq.marks, 0);
      return {
        id: att.id,
        studentName: att.student.name,
        studentId: att.student.studentId,
        quizTitle: att.quiz.title,
        score: att.score,
        maxMarks,
        percentage: att.percentage,
        status: att.status,
        durationSeconds: att.durationSeconds,
        submitTime: att.submitTime,
        startTime: att.startTime
      };
    });

    res.json({ attempts: formatted });
  } catch (error) {
    console.error('Get admin attempts error:', error);
    res.status(500).json({ error: 'Failed to retrieve attempts.' });
  }
};

/**
 * Fetch detailed short answer review card details
 */
exports.getAttemptReviewDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const attempt = await prisma.attempt.findFirst({
      where: {
        id,
        quiz: { userId: req.user.id }
      },
      include: {
        student: true,
        quiz: true,
        answers: {
          where: {
            question: { type: 'SHORT_ANSWER' }
          },
          include: {
            question: true
          }
        }
      }
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Attempt details not found or unauthorized.' });
    }

    // Find quiz question marks mapping
    const quizQuestions = await prisma.quizQuestion.findMany({
      where: { quizId: attempt.quizId },
      select: { questionId: true, marks: true }
    });

    const formattedAnswers = attempt.answers.map(ans => {
      const mapping = quizQuestions.find(qq => qq.questionId === ans.questionId);
      return {
        questionId: ans.questionId,
        questionText: ans.question.questionText,
        studentAnswer: ans.answer,
        referenceAnswer: ans.question.correctAnswer, // reference key terms
        explanation: ans.question.explanation,
        marksObtained: ans.marksObtained,
        maxMarks: mapping ? mapping.marks : 1.0,
        isCorrect: ans.isCorrect,
        reviewed: ans.reviewed
      };
    });

    res.json({
      attempt: {
        id: attempt.id,
        status: attempt.status,
        score: attempt.score,
        percentage: attempt.percentage,
        student: {
          name: attempt.student.name,
          studentId: attempt.student.studentId
        },
        quiz: {
          title: attempt.quiz.title
        }
      },
      shortAnswers: formattedAnswers
    });
  } catch (error) {
    console.error('Get review details error:', error);
    res.status(500).json({ error: 'Failed to load manual review screen details.' });
  }
};

/**
 * Submit manual grading values for short-answer questions
 * Re-evaluates final totals and sets status to COMPLETED once finished
 */
exports.submitShortAnswerGrades = async (req, res) => {
  try {
    const { id } = req.params;
    const { grades } = req.body; // Array of { questionId, isCorrect, marksObtained }

    if (!Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ error: 'Grades mapping array is required.' });
    }

    const attempt = await prisma.attempt.findFirst({
      where: {
        id,
        quiz: { userId: req.user.id }
      },
      include: {
        quiz: {
          include: {
            quizQuestions: true
          }
        }
      }
    });

    if (!attempt || attempt.status === 'STARTED') {
      return res.status(404).json({ error: 'Attempt not ready for manual grading.' });
    }

    // Update grades in transaction
    await prisma.$transaction(async (tx) => {
      for (const item of grades) {
        await tx.attemptAnswer.update({
          where: {
            attemptId_questionId: {
              attemptId: id,
              questionId: item.questionId
            }
          },
          data: {
            isCorrect: Boolean(item.isCorrect),
            marksObtained: parseFloat(item.marksObtained),
            reviewed: true
          }
        });
      }
    });

    // Retrieve all answers to recalculate finalized score
    const allAnswers = await prisma.attemptAnswer.findMany({
      where: { attemptId: id }
    });

    const totalObtained = allAnswers.reduce((sum, a) => sum + (a.marksObtained || 0.0), 0.0);
    const totalPossible = attempt.quiz.quizQuestions.reduce((sum, qq) => sum + qq.marks, 0.0);

    const percentage = totalPossible > 0 
      ? (totalObtained / totalPossible) * 100 
      : 0.0;

    const passed = percentage >= attempt.quiz.passingPercentage;

    // Check if ALL are reviewed
    const allReviewed = allAnswers.every(a => a.reviewed === true);
    const finalStatus = allReviewed ? 'COMPLETED' : 'UNDER_REVIEW';

    const finalized = await prisma.attempt.update({
      where: { id },
      data: {
        score: totalObtained,
        percentage,
        passed,
        status: finalStatus
      }
    });

    res.json({
      message: allReviewed ? 'Grading finalized. Attempt COMPLETED.' : 'Grades saved successfully.',
      attempt: finalized
    });
  } catch (error) {
    console.error('Submit short answer grades error:', error);
    res.status(500).json({ error: 'Failed to submit grading cards.' });
  }
};

/**
 * Quiz level analytics endpoint
 */
exports.getQuizAnalytics = async (req, res) => {
  try {
    const { id: quizId } = req.params;

    // 1. Invoke stale attempts cleanup first!
    await cleanupStaleAttempts(req.user.id);

    // Verify quiz ownership
    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, userId: req.user.id },
      include: {
        quizQuestions: {
          include: { question: true }
        }
      }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }

    const attempts = await prisma.attempt.findMany({
      where: {
        quizId,
        status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'COMPLETED'] }
      }
    });

    const totalAttempts = attempts.length;

    if (totalAttempts === 0) {
      return res.json({
        totalAttempts: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0,
        averageDurationSeconds: 0,
        questionAnalytics: []
      });
    }

    const scores = attempts.map(a => a.percentage);
    const averageScore = scores.reduce((sum, s) => sum + s, 0) / totalAttempts;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    const passedCount = attempts.filter(a => a.passed).length;
    const passRate = (passedCount / totalAttempts) * 100;

    const durations = attempts.map(a => a.durationSeconds);
    const averageDurationSeconds = durations.reduce((sum, d) => sum + d, 0) / totalAttempts;

    // 2. Question-wise accuracy calculations
    const questionAnalytics = [];
    
    // Gather all answers for this quiz
    const attemptIds = attempts.map(a => a.id);
    const allAttemptAnswers = await prisma.attemptAnswer.findMany({
      where: { attemptId: { in: attemptIds } }
    });

    for (const qq of quiz.quizQuestions) {
      const q = qq.question;
      const qAnswers = allAttemptAnswers.filter(aa => aa.questionId === q.id);
      
      const answeredCount = qAnswers.length;
      const correctAnswersCount = qAnswers.filter(aa => aa.isCorrect === true).length;
      const accuracy = answeredCount > 0 ? (correctAnswersCount / answeredCount) * 100 : 0.0;

      questionAnalytics.push({
        questionId: q.id,
        questionText: q.questionText,
        type: q.type,
        topic: q.topic,
        difficulty: q.difficulty,
        accuracy: Math.round(accuracy),
        answeredCount,
        correctCount: correctAnswersCount
      });
    }

    res.json({
      totalAttempts,
      averageScore: Math.round(averageScore * 10) / 10,
      highestScore: Math.round(highestScore * 10) / 10,
      lowestScore: Math.round(lowestScore * 10) / 10,
      passRate: Math.round(passRate),
      averageDurationSeconds: Math.round(averageDurationSeconds),
      questionAnalytics
    });
  } catch (error) {
    console.error('Quiz analytics error:', error);
    res.status(500).json({ error: 'Failed to calculate statistics.' });
  }
};

exports.cleanupStaleAttempts = cleanupStaleAttempts;

/**
 * Fetch authenticated student's history of quiz attempts
 */
exports.getMyAttempts = async (req, res) => {
  try {
    const attempts = await prisma.attempt.findMany({
      where: { studentId: req.user.id },
      include: {
        quiz: {
          select: {
            title: true,
            timeLimit: true,
            passingPercentage: true
          }
        }
      },
      orderBy: { startTime: 'desc' }
    });

    res.json({ attempts });
  } catch (error) {
    console.error('Get my attempts error:', error);
    res.status(500).json({ error: 'Failed to retrieve your attempts history.' });
  }
};
