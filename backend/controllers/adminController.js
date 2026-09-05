const prisma = require('../utils/prisma');
const bcrypt = require('bcrypt');

/**
 * List all registered teacher accounts
 */
exports.listTeachers = async (req, res) => {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      select: {
        id: true,
        username: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            documents: true,
            quizzes: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ teachers });
  } catch (error) {
    console.error('List teachers error:', error);
    res.status(500).json({ error: 'Failed to retrieve teachers roster.' });
  }
};

/**
 * Toggle active status of a teacher account (deactivate/activate)
 */
exports.toggleTeacherStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await prisma.user.findUnique({ where: { id } });
    if (!teacher || teacher.role !== 'TEACHER') {
      return res.status(404).json({ error: 'Teacher account not found.' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !teacher.isActive }
    });

    res.json({
      message: `Teacher account status updated successfully.`,
      teacher: {
        id: updated.id,
        username: updated.username,
        isActive: updated.isActive
      }
    });
  } catch (error) {
    console.error('Toggle teacher status error:', error);
    res.status(500).json({ error: 'Failed to update teacher account status.' });
  }
};

/**
 * Create a new teacher account directly
 */
exports.createTeacher = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Email/username and password are required.' });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(400).json({ error: 'A user with this email/username already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newTeacher = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: 'TEACHER',
        isActive: true
      },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            documents: true,
            quizzes: true
          }
        }
      }
    });

    // Backwards-compatible mock counts for frontend state representation
    if (!newTeacher._count) {
      newTeacher._count = { documents: 0, quizzes: 0 };
    }

    res.status(201).json({
      message: 'Teacher account created successfully.',
      teacher: newTeacher
    });
  } catch (error) {
    console.error('Create teacher error:', error);
    res.status(500).json({ error: 'Failed to create teacher account.' });
  }
};

/**
 * Retrieve comprehensive Admin System Analytics
 */
exports.getSystemAnalytics = async (req, res) => {
  try {
    const totalTeachers = await prisma.user.count({ where: { role: 'TEACHER' } });
    const totalStudents = await prisma.student.count();
    const totalDocuments = await prisma.document.count();
    const processedDocs = await prisma.document.count({ where: { status: 'PROCESSED' } });
    const failedDocs = await prisma.document.count({ where: { status: 'FAILED' } });
    const totalQuestions = await prisma.question.count();
    const approvedQuestions = await prisma.question.count({ where: { status: 'APPROVED' } });
    const totalQuizzes = await prisma.quiz.count();
    const totalAttempts = await prisma.attempt.count();
    const completedAttempts = await prisma.attempt.count({ where: { status: 'COMPLETED' } });
    const passedAttempts = await prisma.attempt.count({ where: { passed: true } });

    const passRate = completedAttempts > 0 ? Math.round((passedAttempts / completedAttempts) * 100) : 0;
    const docSuccessRate = totalDocuments > 0 ? Math.round((processedDocs / totalDocuments) * 100) : 100;

    res.json({
      teachers: totalTeachers,
      students: totalStudents,
      documents: {
        total: totalDocuments,
        processed: processedDocs,
        failed: failedDocs,
        successRate: docSuccessRate
      },
      questions: {
        total: totalQuestions,
        approved: approvedQuestions
      },
      quizzes: totalQuizzes,
      attempts: {
        total: totalAttempts,
        completed: completedAttempts,
        passed: passedAttempts,
        passRate
      }
    });
  } catch (error) {
    console.error('Get system analytics error:', error);
    res.status(500).json({ error: 'Failed to calculate system analytics.' });
  }
};
