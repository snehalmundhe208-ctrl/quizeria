const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { authMiddleware, teacherMiddleware } = require('../middleware/auth');

router.post('/bulk-save', authMiddleware, teacherMiddleware, questionController.bulkSaveQuestions);
router.post('/regenerate', authMiddleware, teacherMiddleware, questionController.regenerateAIQuestion);
router.get('/', authMiddleware, teacherMiddleware, questionController.getQuestions);
router.get('/review-queue', authMiddleware, teacherMiddleware, questionController.getReviewQueue);
router.post('/review-queue/approve', authMiddleware, teacherMiddleware, questionController.approveQuestions);
router.post('/review-queue/reject', authMiddleware, teacherMiddleware, questionController.rejectQuestions);
router.get('/:id/source', authMiddleware, teacherMiddleware, questionController.getQuestionSource);
router.put('/:id', authMiddleware, teacherMiddleware, questionController.updateQuestion);
router.delete('/:id', authMiddleware, teacherMiddleware, questionController.deleteQuestion);

// This matches the document specific sub-route
router.post('/generate/:id', authMiddleware, teacherMiddleware, questionController.generateAIQuestions);

module.exports = router;
