const bcrypt = require('bcrypt');
const prisma = require('../utils/prisma');

/**
 * Update user profile settings (name/email/username)
 * Scoped strictly to req.user.id
 */
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, username } = req.body;
    const targetEmail = (email || username || '').trim();

    if (req.user.role === 'STUDENT') {
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required.' });
      }
      if (!targetEmail) {
        return res.status(400).json({ error: 'Email is required.' });
      }

      // Verify if email already taken by another student
      const existing = await prisma.student.findFirst({
        where: {
          email: targetEmail,
          id: { not: req.user.id }
        }
      });
      if (existing) {
        return res.status(400).json({ error: 'Email is already taken by another account.' });
      }

      const updated = await prisma.student.update({
        where: { id: req.user.id },
        data: {
          name: name.trim(),
          email: targetEmail
        }
      });

      return res.json({
        message: 'Profile updated successfully.',
        user: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          username: updated.email,
          role: 'STUDENT'
        }
      });
    } else {
      // ADMIN or TEACHER
      if (!targetEmail) {
        return res.status(400).json({ error: 'Email/Username is required.' });
      }

      // Verify if username already taken by another User
      const existing = await prisma.user.findFirst({
        where: {
          username: targetEmail,
          id: { not: req.user.id }
        }
      });
      if (existing) {
        return res.status(400).json({ error: 'Username/Email is already taken by another account.' });
      }

      const updated = await prisma.user.update({
        where: { id: req.user.id },
        data: { username: targetEmail }
      });

      return res.json({
        message: 'Profile updated successfully.',
        user: {
          id: updated.id,
          username: updated.username,
          role: updated.role
        }
      });
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile settings.' });
  }
};

/**
 * Change account password
 * Scoped strictly to req.user.id
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    if (req.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { id: req.user.id }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student account not found.' });
      }

      const match = await bcrypt.compare(currentPassword, student.passwordHash);
      if (!match) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await prisma.student.update({
        where: { id: req.user.id },
        data: { passwordHash: newHash }
      });

      return res.json({ message: 'Password updated successfully.' });
    } else {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (!user) {
        return res.status(404).json({ error: 'User account not found.' });
      }

      const match = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!match) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: req.user.id },
        data: { passwordHash: newHash }
      });

      return res.json({ message: 'Password updated successfully.' });
    }
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password.' });
  }
};
