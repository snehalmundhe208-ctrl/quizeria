const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { authMiddleware } = require('../middleware/auth');

router.post('/bulk-save', authMiddleware, questionController.bulkSaveQuestions);
router.post('/regenerate', authMiddleware, questionController.regenerateAIQuestion);
router.get('/', authMiddleware, questionController.getQuestions);
router.put('/:id', authMiddleware, questionController.updateQuestion);
router.delete('/:id', authMiddleware, questionController.deleteQuestion);

// This matches the document specific sub-route
router.post('/generate/:id', authMiddleware, questionController.generateAIQuestions);

module.exports = router;
