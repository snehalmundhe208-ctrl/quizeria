const prisma = require('../utils/prisma');

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
