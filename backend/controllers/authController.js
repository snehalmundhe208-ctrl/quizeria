const prisma = require('../utils/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'studyforge_secret_key_jwt_2026_authentication';

/**
 * Unified Login (detects ADMIN, TEACHER, or STUDENT)
 */
exports.unifiedLogin = async (req, res) => {
  try {
    const credential = req.body.username || req.body.email;
    const { password } = req.body;

    if (!credential || !password) {
      return res.status(400).json({ error: 'Email/Username and password are required.' });
    }

    const trimmedCredential = credential.trim();

    // 1. Check User table (ADMIN and TEACHER)
    const user = await prisma.user.findUnique({ where: { username: trimmedCredential } });

    if (user) {
      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is deactivated. Please contact your administrator.' });
      }

      const match = await bcrypt.compare(password, user.passwordHash);
      if (match) {
        const token = jwt.sign(
          { id: user.id, username: user.username, role: user.role },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        return res.json({
          message: 'Login successful.',
          token,
          user: { id: user.id, username: user.username, role: user.role }
        });
      }
    }

    // 2. Check Student table (STUDENT)
    const student = await prisma.student.findUnique({ where: { email: trimmedCredential } });

    if (student) {
      const match = await bcrypt.compare(password, student.passwordHash);
      if (match) {
        const token = jwt.sign(
          { id: student.id, username: student.email, name: student.name, role: 'STUDENT' },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        return res.json({
          message: 'Login successful.',
          token,
          user: { id: student.id, username: student.email, name: student.name, role: 'STUDENT' }
        });
      }
    }

    // 3. Fallback: Generic invalid credentials error
    return res.status(401).json({ error: 'Invalid credentials.' });
  } catch (error) {
    console.error('Unified login error:', error);
    res.status(500).json({ error: 'An error occurred during login.' });
  }
};

/**
 * Admin Login
 */
exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.role !== 'ADMIN') {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Admin login successful.',
      token,
      user: { id: user.id, username: user.username, role: 'ADMIN' }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'An error occurred during admin login.' });
  }
};

/**
 * Teacher Register
 */
exports.teacherRegister = async (req, res) => {
  try {
    const { name, username, password } = req.body; // username represents email/username input
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Name, email/username, and password are required.' });
    }

    // Check if username already exists
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(400).json({ error: 'Username already taken.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: 'TEACHER',
        isActive: true
      }
    });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: 'TEACHER' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Teacher account created successfully.',
      token,
      user: { id: user.id, username: user.username, role: 'TEACHER' }
    });
  } catch (error) {
    console.error('Teacher registration error:', error);
    res.status(500).json({ error: 'Failed to register teacher account.' });
  }
};

/**
 * Teacher Login
 */
exports.teacherLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.role !== 'TEACHER') {
      return res.status(401).json({ error: 'Invalid teacher credentials.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Teacher account is deactivated. Please contact your administrator.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid teacher credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: 'TEACHER' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Teacher login successful.',
      token,
      user: { id: user.id, username: user.username, role: 'TEACHER' }
    });
  } catch (error) {
    console.error('Teacher login error:', error);
    res.status(500).json({ error: 'An error occurred during teacher login.' });
  }
};

/**
 * Student Register
 */
exports.studentRegister = async (req, res) => {
  try {
    const { name, email, password, studentId } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    // Check if email already registered
    const existingEmail = await prisma.student.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    if (studentId) {
      const existingId = await prisma.student.findUnique({ where: { studentId } });
      if (existingId) {
        return res.status(400).json({ error: 'Student ID already registered.' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const student = await prisma.student.create({
      data: {
        name,
        email,
        passwordHash,
        studentId: studentId || null
      }
    });

    const token = jwt.sign(
      { id: student.id, username: student.email, name: student.name, role: 'STUDENT' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Student account created successfully.',
      token,
      user: { id: student.id, username: student.email, name: student.name, role: 'STUDENT' }
    });
  } catch (error) {
    console.error('Student registration error:', error);
    res.status(500).json({ error: 'Failed to register student account.' });
  }
};

/**
 * Student Login
 */
exports.studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const student = await prisma.student.findUnique({ where: { email } });
    if (!student) {
      return res.status(401).json({ error: 'Invalid student credentials.' });
    }

    const match = await bcrypt.compare(password, student.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid student credentials.' });
    }

    const token = jwt.sign(
      { id: student.id, username: student.email, name: student.name, role: 'STUDENT' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Student login successful.',
      token,
      user: { id: student.id, username: student.email, name: student.name, role: 'STUDENT' }
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ error: 'An error occurred during student login.' });
  }
};

/**
 * Current Profile Fetch
 */
exports.getMe = async (req, res) => {
  try {
    if (req.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { id: req.user.id },
        select: { id: true, name: true, email: true, studentId: true, createdAt: true }
      });
      if (!student) {
        return res.status(404).json({ error: 'Student profile not found.' });
      }
      const attemptsCount = await prisma.attempt.count({
        where: { studentId: req.user.id }
      });
      return res.json({ 
        user: { 
          ...student, 
          username: student.email, 
          role: 'STUDENT',
          stats: { attemptsCount }
        } 
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, role: true, isActive: true, createdAt: true }
    });
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    let stats = {};
    if (user.role === 'ADMIN') {
      const teachersCount = await prisma.user.count({ where: { role: 'TEACHER' } });
      const quizzesCount = await prisma.quiz.count();
      stats = { teachersCount, quizzesCount };
    } else if (user.role === 'TEACHER') {
      const docsCount = await prisma.document.count({ where: { userId: user.id } });
      const quizzesCount = await prisma.quiz.count({ where: { userId: user.id } });
      stats = { docsCount, quizzesCount };
    }

    res.json({ user: { ...user, stats } });
  } catch (error) {
    console.error('getMe profile fetch error:', error);
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
};
