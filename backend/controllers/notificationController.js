const prisma = require('../utils/prisma');

/**
 * Fetch all notifications for logged-in User or Student
 */
exports.getNotifications = async (req, res) => {
  try {
    const recipientId = req.user.id;

    const notifications = await prisma.notification.findMany({
      where: { recipientId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
};

/**
 * Mark a single notification as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const recipientId = req.user.id;

    const notification = await prisma.notification.findFirst({
      where: { id, recipientId }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true }
    });

    res.json({ message: 'Notification marked as read.', notification: updated });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
};

/**
 * Mark all notifications as read
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const recipientId = req.user.id;

    await prisma.notification.updateMany({
      where: { recipientId, read: false },
      data: { read: true }
    });

    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
};
