const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

router.post('/admin/login', authController.adminLogin);
router.post('/teacher/register', authController.teacherRegister);
router.post('/teacher/login', authController.teacherLogin);
router.post('/student/register', authController.studentRegister);
router.post('/student/login', authController.studentLogin);

router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
