const prisma = require('./prisma');

/**
 * Creates an in-app notification record for a User or Student
 */
exports.createNotification = async ({ recipientId, recipientType = 'USER', title, message, link = null }) => {
  try {
    if (!recipientId || !title || !message) return null;

    return await prisma.notification.create({
      data: {
        recipientId,
        recipientType, // 'USER' or 'STUDENT'
        title,
        message,
        link,
        read: false
      }
    });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
    return null;
  }
};
