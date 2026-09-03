const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { authMiddleware, teacherMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, teacherMiddleware, classController.getClasses);
router.post('/', authMiddleware, teacherMiddleware, classController.createClass);
router.post('/:id/students', authMiddleware, teacherMiddleware, classController.enrollStudent);
router.post('/:id/assignments', authMiddleware, teacherMiddleware, classController.createAssignment);

module.exports = router;
