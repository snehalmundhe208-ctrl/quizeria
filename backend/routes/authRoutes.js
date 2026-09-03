const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

router.post('/login', authController.unifiedLogin);
router.post('/admin/login', authController.unifiedLogin);
router.post('/teacher/register', authController.teacherRegister);
router.post('/teacher/login', authController.unifiedLogin);
router.post('/student/register', authController.studentRegister);
router.post('/student/login', authController.unifiedLogin);

router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
