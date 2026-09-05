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

    const newClass = await prisma.class.create({
      data: {
        name,
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

    res.status(201).json({
      message: 'Quiz assigned to class successfully.',
      assignment
    });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Failed to assign quiz to class.' });
  }
};
