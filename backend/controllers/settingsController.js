const bcrypt = require('bcrypt');
const prisma = require('../utils/prisma');

/**
 * Update user profile settings
 */
exports.updateProfile = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required.' });
    }

    // Verify if username already exists for another user
    const existing = await prisma.user.findFirst({
      where: {
        username: username.trim(),
        id: { not: req.user.id }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Username already taken.' });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { username: username.trim() }
    });

    res.json({
      message: 'Profile updated successfully.',
      user: {
        id: updated.id,
        username: updated.username,
        role: updated.role
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(550).json({ error: 'Failed to update profile settings.' });
  }
};

/**
 * Change account password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
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

    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password.' });
  }
};
