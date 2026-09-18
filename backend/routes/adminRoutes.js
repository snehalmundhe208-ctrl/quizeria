const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/teachers', authMiddleware, adminMiddleware, adminController.listTeachers);
router.post('/teachers', authMiddleware, adminMiddleware, adminController.createTeacher);
router.put('/teachers/:id/toggle', authMiddleware, adminMiddleware, adminController.toggleTeacherStatus);
router.get('/analytics', authMiddleware, adminMiddleware, adminController.getSystemAnalytics);

// Features 8 & 9: Admin AI Monitoring & Teacher Engagement Leaderboard
router.get('/ai-usage', authMiddleware, adminMiddleware, adminController.getAiUsageMonitoring);
router.get('/teacher-engagement', authMiddleware, adminMiddleware, adminController.getTeacherEngagementLeaderboard);

module.exports = router;
