const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/teachers', authMiddleware, adminMiddleware, adminController.listTeachers);
router.post('/teachers', authMiddleware, adminMiddleware, adminController.createTeacher);
router.put('/teachers/:id/toggle', authMiddleware, adminMiddleware, adminController.toggleTeacherStatus);
router.get('/analytics', authMiddleware, adminMiddleware, adminController.getSystemAnalytics);

module.exports = router;
