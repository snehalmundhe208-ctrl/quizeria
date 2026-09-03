const express = require('express');
const router = express.Router();
const practiceController = require('../controllers/practiceController');
const { authMiddleware } = require('../middleware/auth');

router.get('/weak-topics', authMiddleware, practiceController.getStudentWeakTopics);
router.post('/weak-topics/generate', authMiddleware, practiceController.generateWeakTopicsPractice);

module.exports = router;
