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
