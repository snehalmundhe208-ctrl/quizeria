const prisma = require('../utils/prisma');
const attemptController = require('./attemptController');

exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (isAdmin) {
      const teachersCount = await prisma.user.count({ where: { role: 'TEACHER' } });
      const studentsCount = await prisma.student.count();
      const documentsCount = await prisma.document.count();
      const quizzesCount = await prisma.quiz.count();
      const papersCount = await prisma.questionPaper.count();
      const publishedQuizzes = await prisma.quiz.count({ where: { status: 'PUBLISHED' } });

      const attempts = await prisma.attempt.findMany({
        select: { percentage: true }
      });
      const totalAttempts = attempts.length;
      const averageScore = totalAttempts > 0
        ? (attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts).toFixed(1)
        : 0;

      // Admin recent activity
      const recentTeachers = await prisma.user.findMany({
        where: { role: 'TEACHER' },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      const recentAttempts = await prisma.attempt.findMany({
        where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'COMPLETED'] } },
        orderBy: { submitTime: 'desc' },
        take: 5,
        include: {
          student: { select: { name: true } },
          quiz: { select: { title: true } }
        }
      });

      const activities = [
        ...recentTeachers.map(t => ({
          id: t.id,
          type: 'teacher',
          message: `New teacher registered: "${t.username}"`,
          date: t.createdAt
        })),
        ...recentAttempts.map(att => ({
          id: att.id,
          type: 'attempt',
          message: `Student "${att.student.name}" submitted "${att.quiz.title}"`,
          date: att.submitTime || att.createdAt
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

      return res.json({
        stats: {
          totalTeachers: teachersCount,
          totalStudents: studentsCount,
          totalDocuments: documentsCount,
          totalQuizzes: quizzesCount,
          totalQuestionPapers: papersCount,
          totalAttempts,
          averageScore: Number(averageScore),
          publishedAssessments: publishedQuizzes,
        },
        recentActivity: activities
      });
    }

    // Teacher-scoped stats
    await attemptController.cleanupStaleAttempts(userId).catch(e => console.error(e));

    const documentsCount = await prisma.document.count({ where: { userId } });
    const quizzesCount = await prisma.quiz.count({ where: { userId } });
    const papersCount = await prisma.questionPaper.count({ where: { userId } });

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
