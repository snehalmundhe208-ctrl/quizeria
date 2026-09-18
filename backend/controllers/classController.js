const prisma = require('../utils/prisma');

/**
 * List all classes for the logged in teacher
 */
exports.getClasses = async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      where: { userId: req.user.id },
      include: {
        _count: {
          select: {
            students: true,
            assignments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ classes });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Failed to retrieve classes.' });
  }
};

/**
 * Create a new class
 */
exports.createClass = async (req, res) => {
  try {
    const { name, section, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Class name is required.' });
    }

    const crypto = require('crypto');
    const shortCode = crypto.randomBytes(4).toString('hex').toUpperCase().substring(0, 6);

    const newClass = await prisma.class.create({
      data: {
        name,
        code: shortCode,
        subject: section || description || null,
        userId: req.user.id
      },
      include: {
        _count: {
          select: { students: true, assignments: true }
        }
      }
    });

    res.status(201).json({
      message: 'Class created successfully.',
      class: newClass
    });
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ error: 'Failed to create class.' });
  }
};

/**
 * Enroll a student into a class
 */
exports.enrollStudent = async (req, res) => {
  try {
    const { id } = req.params; // classId
    const { studentId } = req.body;

    const classRecord = await prisma.class.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!classRecord) {
      return res.status(404).json({ error: 'Class not found or unauthorized.' });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    const enrollment = await prisma.classStudent.create({
      data: {
        classId: id,
        studentId
      }
    });

    res.status(201).json({
      message: 'Student enrolled successfully.',
      enrollment
    });
  } catch (error) {
    console.error('Enroll student error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Student is already enrolled in this class.' });
    }
    res.status(500).json({ error: 'Failed to enroll student.' });
  }
};

/**
 * Assign a Quiz to a Class
 */
exports.createAssignment = async (req, res) => {
  try {
    const { id } = req.params; // classId
    const { quizId, dueDate } = req.body;

    if (!quizId) {
      return res.status(400).json({ error: 'Quiz ID is required.' });
    }

    const classRecord = await prisma.class.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!classRecord) {
      return res.status(404).json({ error: 'Class not found or unauthorized.' });
    }

    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, userId: req.user.id }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found or unauthorized.' });
    }

    const assignment = await prisma.assignment.create({
      data: {
        title: quiz.title,
        classId: id,
        quizId,
        userId: req.user.id,
        deadline: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 3600 * 1000)
      },
      include: {
        quiz: { select: { title: true, timeLimit: true } }
      }
    });

    // Notify enrolled students (Feature 10)
    const { createNotification } = require('../utils/notificationService');
    const classStudents = await prisma.classStudent.findMany({
      where: { classId: id },
      select: { studentId: true }
    });

    for (const cs of classStudents) {
      await createNotification({
        recipientId: cs.studentId,
        recipientType: 'STUDENT',
        title: 'New Quiz Assigned',
        message: `New quiz "${quiz.title}" has been assigned in class "${classRecord.name}".`,
        link: `/classes`
      });
    }

    res.status(201).json({
      message: 'Quiz assigned to class successfully.',
      assignment
    });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Failed to assign quiz to class.' });
  }
};

/**
 * FEATURE 6: Generate Class Performance Insights (AI-generated Teaching Summary)
 */
exports.generateClassInsights = async (req, res) => {
  try {
    const { id: classId } = req.params;

    const classRecord = await prisma.class.findFirst({
      where: { id: classId, userId: req.user.id },
      include: {
        students: { select: { studentId: true } },
        assignments: { select: { quizId: true, title: true } }
      }
    });

    if (!classRecord) {
      return res.status(404).json({ error: 'Class not found or unauthorized.' });
    }

    const studentIds = classRecord.students.map(s => s.studentId);
    const quizIds = classRecord.assignments.map(a => a.quizId);

    if (studentIds.length === 0 || quizIds.length === 0) {
      return res.status(400).json({
        error: 'Class requires at least 1 enrolled student and 1 assigned quiz to generate AI performance insights.'
      });
    }

    // Fetch attempts & answers for this class
    const attempts = await prisma.attempt.findMany({
      where: {
        studentId: { in: studentIds },
        quizId: { in: quizIds },
        status: { in: ['SUBMITTED', 'COMPLETED'] }
      },
      include: {
        answers: {
          include: {
            question: { select: { topic: true, difficulty: true } }
          }
        }
      }
    });

    if (attempts.length === 0) {
      return res.status(400).json({
        error: 'No completed quiz attempts found for this class yet.'
      });
    }

    // Compute aggregate metrics
    const totalAttempts = attempts.length;
    const avgScore = Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts);

    // Topic performance breakdown
    const topicMap = {};
    for (const a of attempts) {
      for (const ans of a.answers) {
        if (!ans.question) continue;
        const topic = ans.question.topic || 'General';
        if (!topicMap[topic]) topicMap[topic] = { topic, total: 0, correct: 0 };
        topicMap[topic].total++;
        if (ans.isCorrect) topicMap[topic].correct++;
      }
    }

    const topicStats = Object.values(topicMap).map(t => ({
      topic: t.topic,
      accuracy: Math.round((t.correct / t.total) * 100)
    }));

    const weakTopics = topicStats.filter(t => t.accuracy < 65);
    const strongTopics = topicStats.filter(t => t.accuracy >= 75);

    const aiService = require('../services/aiService');
    const prompt = `You are StudyForge AI Lead Pedagogical Advisor. Provide a clear, actionable Class Performance Summary for the educator.

CLASS DATA:
- Class Name: "${classRecord.name}"
- Enrolled Students: ${studentIds.length}
- Completed Assessments: ${totalAttempts}
- Class Average Score: ${avgScore}%
- Weak Concepts (<65% Accuracy): ${weakTopics.map(t => `${t.topic} (${t.accuracy}%)`).join(', ') || 'None identified'}
- Strong Concepts (≥75% Accuracy): ${strongTopics.map(t => `${t.topic} (${t.accuracy}%)`).join(', ') || 'None identified'}

Format the response into 3 concise sections with Markdown:
1. **Executive Performance Summary**: Overall evaluation of class mastery.
2. **Key Weak Areas**: Specific conceptual bottlenecks identified in student attempts.
3. **Actionable Teaching Suggestions**: 2-3 specific instructional adjustments for the next lesson.`;

    let summaryText;
    try {
      summaryText = await aiService.generateExplanation(prompt);
    } catch (err) {
      console.log('Class insights AI fallback:', err.message);
      summaryText = `### Executive Performance Summary\nClass average is **${avgScore}%** across ${totalAttempts} completed attempts.\n\n### Key Weak Areas\n${weakTopics.map(t => `- **${t.topic}**: ${t.accuracy}% accuracy`).join('\n') || '- No critical weak areas detected.'}\n\n### Teaching Suggestions\n- Review weak concepts in the upcoming lecture.\n- Schedule a targeted practice session.`;
    }

    const insightsData = {
      summary: summaryText,
      generatedAt: new Date().toISOString(),
      classAveragePercentage: avgScore,
      totalAttempts,
      topicStats
    };

    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: { aiInsights: insightsData }
    });

    // Log AI Usage (Feature 8)
    await prisma.aiUsageLog.create({
      data: {
        userId: req.user.id,
        featureType: 'CLASS_INSIGHTS',
        promptTokens: 250,
        completionTokens: 350,
        estimatedCost: 0.0008
      }
    });

    res.json({
      message: 'Class performance insights generated successfully.',
      insights: updatedClass.aiInsights
    });
  } catch (error) {
    console.error('Generate class insights error:', error);
    res.status(500).json({ error: 'Failed to generate class performance insights.' });
  }
};
