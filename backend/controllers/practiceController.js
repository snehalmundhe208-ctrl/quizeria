const prisma = require('../utils/prisma');
const aiService = require('../services/aiService');

/**
 * Analyze student's weak topics based on past attempts
 */
exports.getStudentWeakTopics = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Fetch all completed attempt answers for this student
    const answers = await prisma.attemptAnswer.findMany({
      where: {
        attempt: { studentId }
      },
      include: {
        question: { select: { topic: true } }
      }
    });

    if (answers.length === 0) {
      return res.json({
        totalAttempted: 0,
        weakTopics: [],
        strongTopics: [],
        topicStats: []
      });
    }

    // Group answers by topic
    const topicMap = {};
    for (const ans of answers) {
      const topic = ans.question ? ans.question.topic : 'General';
      if (!topicMap[topic]) {
        topicMap[topic] = { topic, total: 0, correct: 0 };
      }
      topicMap[topic].total += 1;
      if (ans.isCorrect === true) {
        topicMap[topic].correct += 1;
      }
    }

    const topicStats = Object.values(topicMap).map(t => ({
      topic: t.topic,
      total: t.total,
      correct: t.correct,
      accuracy: Math.round((t.correct / t.total) * 100)
    }));

    const weakTopics = topicStats.filter(t => t.accuracy < 70);
    const strongTopics = topicStats.filter(t => t.accuracy >= 80);

    res.json({
      totalAttempted: answers.length,
      weakTopics,
      strongTopics,
      topicStats
    });
  } catch (error) {
    console.error('Get student weak topics error:', error);
    res.status(500).json({ error: 'Failed to analyze student weak topics.' });
  }
};

/**
 * Generate a personalized practice quiz targeted at weak topics
 */
exports.generateWeakTopicsPractice = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { count = 10 } = req.body;

    // Find student's weak topics
    const answers = await prisma.attemptAnswer.findMany({
      where: { attempt: { studentId } },
      include: { question: { select: { topic: true, documentId: true } } }
    });

    const topicMap = {};
    const docIds = new Set();

    for (const ans of answers) {
      if (!ans.question) continue;
      const topic = ans.question.topic;
      docIds.add(ans.question.documentId);

      if (!topicMap[topic]) {
        topicMap[topic] = { topic, total: 0, correct: 0 };
      }
      topicMap[topic].total += 1;
      if (ans.isCorrect === true) {
        topicMap[topic].correct += 1;
      }
    }

    const topicStats = Object.values(topicMap).map(t => ({
      topic: t.topic,
      accuracy: Math.round((t.correct / t.total) * 100)
    }));

    let weakTopicsList = topicStats.filter(t => t.accuracy < 70).map(t => t.topic);

    // If no weak topics found yet, default to all attempted topics or General
    if (weakTopicsList.length === 0) {
      weakTopicsList = topicStats.map(t => t.topic);
    }
    if (weakTopicsList.length === 0) {
      weakTopicsList = ['General Review'];
    }

    // Fetch existing questions from Question Bank matching weak topics
    const matchingQuestions = await prisma.question.findMany({
      where: {
        topic: { in: weakTopicsList },
        status: 'APPROVED'
      },
      take: parseInt(count, 10)
    });

    if (matchingQuestions.length === 0) {
      return res.status(404).json({
        error: 'No practice questions found for your weak topics. Please complete more document quizzes first.'
      });
    }

    // Create a personalized Practice Quiz
    const targetTopicsStr = weakTopicsList.slice(0, 3).join(', ');
    const title = `Personalized Practice: ${targetTopicsStr}`;

    // Find an active user/teacher account to own the practice quiz
    const teacherUser = await prisma.user.findFirst({
      where: { role: { in: ['TEACHER', 'ADMIN'] } }
    });

    if (!teacherUser) {
      return res.status(500).json({ error: 'No educator account available to create practice quiz.' });
    }

    const crypto = require('crypto');
    const practiceQuiz = await prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          title,
          description: `Targeted practice quiz generated to strengthen weak topics (${targetTopicsStr}).`,
          instructions: 'Practice Mode: Explanations and immediate feedback are enabled.',
          timeLimit: 15,
          passingPercentage: 70.0,
          attemptsAllowed: 10,
          negativeMarking: 0.0,
          mode: 'PRACTICE',
          showResultImmediately: true,
          revealAnswersAfterSubmission: true,
          status: 'PUBLISHED',
          userId: teacherUser.id
        }
      });

      // Link questions
      const quizQuestions = matchingQuestions.map((q, idx) => ({
        quizId: quiz.id,
        questionId: q.id,
        marks: 1.0,
        sortOrder: idx
      }));

      await tx.quizQuestion.createMany({ data: quizQuestions });

      // Create share link
      const link = await tx.shareLink.create({
        data: {
          quizId: quiz.id,
          shareCode: crypto.randomUUID(),
          isActive: true
        }
      });

      return { quiz, shareCode: link.shareCode };
    });

    res.json({
      message: 'Personalized practice quiz created!',
      shareCode: practiceQuiz.shareCode,
      quizTitle: practiceQuiz.quiz.title,
      questionCount: matchingQuestions.length,
      weakTopics: weakTopicsList
    });
  } catch (error) {
    console.error('Generate weak topics practice error:', error);
    res.status(500).json({ error: 'Failed to generate personalized practice quiz.' });
  }
};

/**
 * FEATURE 1: Study Streak Tracker
 * Calculates consecutive active days (calendar days with >=1 quiz attempt)
 */
exports.getStudentStreak = async (req, res) => {
  try {
    const studentId = req.user.id;

    const attempts = await prisma.attempt.findMany({
      where: {
        studentId,
        status: { in: ['SUBMITTED', 'COMPLETED'] }
      },
      select: { createdAt: true, submitTime: true },
      orderBy: { createdAt: 'desc' }
    });

    if (attempts.length === 0) {
      return res.json({
        currentStreak: 0,
        longestStreak: 0,
        totalActiveDays: 0,
        history: []
      });
    }

    // Map timestamps to unique YYYY-MM-DD date strings in UTC
    const dateSet = new Set();
    for (const a of attempts) {
      const dateObj = a.submitTime || a.createdAt;
      const dateStr = dateObj.toISOString().split('T')[0];
      dateSet.add(dateStr);
    }

    const sortedDates = Array.from(dateSet).sort((a, b) => new Date(b) - new Date(a)); // Descending order
    const totalActiveDays = sortedDates.length;

    // Calculate current streak
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayStr = yesterdayObj.toISOString().split('T')[0];

    let currentStreak = 0;
    let checkDate = new Date(sortedDates[0]);

    // Streak is active if student completed an attempt today or yesterday
    const hasActivityRecent = sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr;

    if (hasActivityRecent) {
      let tempDate = new Date(sortedDates[0]);
      for (let i = 0; i < sortedDates.length; i++) {
        const currentDate = new Date(sortedDates[i]);
        const diffDays = Math.round((tempDate - currentDate) / (1000 * 60 * 60 * 24));

        if (i === 0 || diffDays === 1) {
          currentStreak++;
          tempDate = currentDate;
        } else if (diffDays > 1) {
          break;
        }
      }
    }

    // Calculate longest streak across history
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate = null;

    // Iterate chronological order
    const chronoDates = [...sortedDates].reverse();
    for (const dStr of chronoDates) {
      const d = new Date(dStr);
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((d - prevDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      prevDate = d;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    }

    res.json({
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      totalActiveDays,
      history: sortedDates.slice(0, 14)
    });
  } catch (error) {
    console.error('Get student streak error:', error);
    res.status(500).json({ error: 'Failed to calculate study streak.' });
  }
};

/**
 * FEATURE 2: Spaced-Repetition Weak-Question Review
 * Get count & list of questions due for review today
 */
exports.getSpacedReviewDue = async (req, res) => {
  try {
    const studentId = req.user.id;
    const now = new Date();

    const dueReviews = await prisma.spacedReview.findMany({
      where: {
        studentId,
        status: 'DUE',
        nextReviewAt: { lte: now }
      },
      include: {
        question: {
          select: {
            id: true,
            type: true,
            questionText: true,
            options: true,
            explanation: true,
            difficulty: true,
            topic: true,
            sourcePage: true,
            sourceSection: true
          }
        }
      },
      orderBy: { nextReviewAt: 'asc' },
      take: 20
    });

    res.json({
      dueCount: dueReviews.length,
      questions: dueReviews.map(r => ({
        reviewId: r.id,
        intervalStep: r.intervalStep,
        lastFailedAt: r.lastFailedAt,
        ...r.question
      }))
    });
  } catch (error) {
    console.error('Get spaced review due error:', error);
    res.status(500).json({ error: 'Failed to retrieve spaced repetition queue.' });
  }
};

/**
 * FEATURE 2: Submit Spaced Repetition Answers & Advance Intervals
 */
exports.submitSpacedReview = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { answers = [] } = req.body; // [{ questionId, isCorrect }]

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'Answers array is required.' });
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      for (const item of answers) {
        if (!item.questionId || item.isCorrect === undefined) continue;

        const review = await tx.spacedReview.findUnique({
          where: { studentId_questionId: { studentId, questionId: item.questionId } }
        });

        if (!review) continue;

        if (item.isCorrect) {
          let nextStep = review.intervalStep + 1;
          let daysToAdd = 3;
          let nextStatus = 'REVIEWED';

          if (review.intervalStep === 1) {
            daysToAdd = 3; // 3 days for step 2
          } else if (review.intervalStep === 2) {
            daysToAdd = 7; // 7 days for step 3
          } else {
            nextStatus = 'GRADUATED';
            daysToAdd = 30;
          }

          const nextReviewAt = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

          await tx.spacedReview.update({
            where: { id: review.id },
            data: {
              intervalStep: nextStep,
              nextReviewAt,
              status: nextStatus
            }
          });
        } else {
          // Reset to Day 1
          const nextReviewAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          await tx.spacedReview.update({
            where: { id: review.id },
            data: {
              intervalStep: 1,
              lastFailedAt: now,
              nextReviewAt,
              status: 'DUE'
            }
          });
        }
      }
    });

    res.json({ message: 'Spaced review progress recorded successfully.' });
  } catch (error) {
    console.error('Submit spaced review error:', error);
    res.status(500).json({ error: 'Failed to record spaced review progress.' });
  }
};

/**
 * FEATURE 3: "Explain My Mistake" AI Chat
 * Focuses AI explanation strictly on why the student's answer was wrong
 */
exports.explainMistake = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { questionId, studentAnswer } = req.body;

    if (!questionId) {
      return res.status(400).json({ error: 'Question ID is required.' });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { chunk: true, document: { select: { name: true } } }
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    // Format options / correct answer text
    let correctAnswerText = question.correctAnswer;
    if (question.type === 'MCQ' && Array.isArray(question.options)) {
      const idx = parseInt(question.correctAnswer, 10);
      if (!isNaN(idx) && question.options[idx]) {
        correctAnswerText = question.options[idx];
      }
    }

    const prompt = `You are an encouraging StudyForge AI Tutor. A student got a question wrong and needs a clear, educational explanation.

QUESTION:
${question.questionText}

STUDENT'S WRONG ANSWER:
${studentAnswer || '(No answer provided)'}

CORRECT ANSWER:
${correctAnswerText}

REFERENCE EXPLANATION / CONTEXT:
${question.explanation || ''}
${question.chunk ? `Document Chunk Text: ${question.chunk.text}` : ''}

Provide a concise 2-3 paragraph explanation:
1. Explain specifically WHY the student's answer "${studentAnswer || 'blank'}" is incorrect.
2. Explain WHY "${correctAnswerText}" is the correct answer based on the underlying concept.
3. Give 1 key tip or mnemonic to help the student remember this concept next time.`;

    let aiReply;
    try {
      aiReply = await aiService.generateExplanation(prompt);
    } catch (err) {
      console.log('Explain mistake AI fallback:', err.message);
      aiReply = `**Concept Breakdown:**\n\n- **Your Choice:** ${studentAnswer || 'None'}\n- **Correct Choice:** ${correctAnswerText}\n\n${question.explanation || 'Review the core concept in your document notes.'}`;
    }

    // Log AI Usage for Student (Feature 8 tracking)
    await prisma.aiUsageLog.create({
      data: {
        studentId,
        featureType: 'EXPLAIN_MISTAKE',
        promptTokens: 180,
        completionTokens: 220,
        estimatedCost: 0.0004
      }
    });

    res.json({ reply: aiReply });
  } catch (error) {
    console.error('Explain mistake error:', error);
    res.status(500).json({ error: 'Failed to generate mistake explanation.' });
  }
};

/**
 * FEATURE 4: Class Leaderboard (Opt-In, Per Class)
 * Ranks opted-in students by average PERCENTAGE (Attempt.percentage)
 */
exports.getClassLeaderboard = async (req, res) => {
  try {
    const { id: classId } = req.params;
    const currentStudentId = req.user.id;

    // Check class existence and student membership
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                isLeaderboardOptIn: true
              }
            }
          }
        },
        assignments: { select: { quizId: true } }
      }
    });

    if (!classRecord) {
      return res.status(404).json({ error: 'Class not found.' });
    }

    const quizIds = classRecord.assignments.map(a => a.quizId);

    // Filter enrolled students who have opted into the leaderboard
    const optedInStudents = classRecord.students
      .map(cs => cs.student)
      .filter(s => s.isLeaderboardOptIn || s.id === currentStudentId);

    if (optedInStudents.length === 0) {
      return res.json({
        className: classRecord.name,
        leaderboard: [],
        currentUserOptIn: false
      });
    }

    const leaderboardData = [];

    for (const s of optedInStudents) {
      // Calculate average percentage for attempts on class assigned quizzes (or all quizzes if none assigned yet)
      const attemptWhere = { studentId: s.id, status: { in: ['SUBMITTED', 'COMPLETED'] } };
      if (quizIds.length > 0) {
        attemptWhere.quizId = { in: quizIds };
      }

      const attempts = await prisma.attempt.findMany({
        where: attemptWhere,
        select: { percentage: true, passed: true }
      });

      const completedCount = attempts.length;
      let avgPercentage = 0;
      if (completedCount > 0) {
        const totalPct = attempts.reduce((sum, a) => sum + a.percentage, 0);
        avgPercentage = Math.round(totalPct / completedCount);
      }

      // Check current student opt-in state
      const isCurrent = s.id === currentStudentId;

      leaderboardData.push({
        studentId: s.id,
        name: isCurrent ? `${s.name} (You)` : (s.isLeaderboardOptIn ? s.name : 'Anonymous Student'),
        averagePercentage: avgPercentage,
        completedQuizzes: completedCount,
        isOptedIn: s.isLeaderboardOptIn,
        isCurrentUser: isCurrent
      });
    }

    // Sort descending by average percentage, then completed quizzes
    leaderboardData.sort((a, b) => b.averagePercentage - a.averagePercentage || b.completedQuizzes - a.completedQuizzes);

    // Assign 1-based ranks
    const rankedLeaderboard = leaderboardData.map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

    const currentUserStudent = classRecord.students.find(cs => cs.studentId === currentStudentId)?.student;

    res.json({
      className: classRecord.name,
      leaderboard: rankedLeaderboard,
      currentUserOptIn: currentUserStudent ? currentUserStudent.isLeaderboardOptIn : false
    });
  } catch (error) {
    console.error('Get class leaderboard error:', error);
    res.status(500).json({ error: 'Failed to retrieve class leaderboard.' });
  }
};

/**
 * FEATURE 4: Toggle Leaderboard Opt-In Preference
 */
exports.toggleLeaderboardOptIn = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { isLeaderboardOptIn } = req.body;

    if (typeof isLeaderboardOptIn !== 'boolean') {
      return res.status(400).json({ error: 'isLeaderboardOptIn boolean parameter is required.' });
    }

    const updated = await prisma.student.update({
      where: { id: studentId },
      data: { isLeaderboardOptIn }
    });

    res.json({
      message: `Leaderboard preference updated. You are now ${updated.isLeaderboardOptIn ? 'Opted IN' : 'Opted OUT'}.`,
      isLeaderboardOptIn: updated.isLeaderboardOptIn
    });
  } catch (error) {
    console.error('Toggle leaderboard opt-in error:', error);
    res.status(500).json({ error: 'Failed to update leaderboard preference.' });
  }
};

