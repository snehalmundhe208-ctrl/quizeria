const prisma = require('../utils/prisma');
const attemptController = require('./attemptController');

exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Trigger cleanup of stale attempts on stats read
    await attemptController.cleanupStaleAttempts(userId).catch(e => console.error(e));

    // 1. Get counts
    const documentsCount = await prisma.document.count({ where: { userId } });
    const quizzesCount = await prisma.quiz.count({ where: { userId } });
    const papersCount = await prisma.questionPaper.count({ where: { userId } });

    // 2. Attempts owned by this user's quizzes
    const attempts = await prisma.attempt.findMany({
      where: {
        quiz: { userId }
      },
      select: {
        score: true,
        percentage: true,
        studentId: true,
      }
    });

    const totalAttempts = attempts.length;
    const averageScore = totalAttempts > 0 
      ? (attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts).toFixed(1)
      : 0;

    // Unique participants
    const uniqueStudents = new Set(attempts.map(a => a.studentId));
    const totalStudents = uniqueStudents.size;

    // Published quizzes
    const publishedQuizzes = await prisma.quiz.count({
      where: {
        userId,
        status: 'PUBLISHED'
      }
    });

    // Recent activities (gather recent student submissions)
    const recentAttempts = await prisma.attempt.findMany({
      where: {
        quiz: { userId },
        status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'COMPLETED'] }
      },
      orderBy: { submitTime: 'desc' },
      take: 5,
      include: {
        student: { select: { name: true } },
        quiz: { select: { title: true } }
      }
    });

    const activities = recentAttempts.map(att => ({
      id: att.id,
      type: 'attempt',
      message: `Student "${att.student.name}" submitted "${att.quiz.title}"`,
      status: att.status,
      date: att.submitTime
    }));

    res.json({
      stats: {
        totalDocuments: documentsCount,
        totalQuizzes: quizzesCount,
        totalQuestionPapers: papersCount,
        totalStudents,
        totalAttempts,
        averageScore: Number(averageScore),
        publishedAssessments: publishedQuizzes,
      },
      recentActivity: activities
    });
  } catch (error) {
    console.error('getStats error:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard stats.' });
  }
};
