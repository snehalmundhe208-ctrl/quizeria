const express = require('express');
const router = express.Router();
const practiceController = require('../controllers/practiceController');
const { authMiddleware } = require('../middleware/auth');

router.get('/weak-topics', authMiddleware, practiceController.getStudentWeakTopics);
router.post('/weak-topics/generate', authMiddleware, practiceController.generateWeakTopicsPractice);

// Student Feature 1: Study Streak Tracker
router.get('/streak', authMiddleware, practiceController.getStudentStreak);

// Student Feature 2: Spaced Repetition Queue
router.get('/spaced-review/due', authMiddleware, practiceController.getSpacedReviewDue);
router.post('/spaced-review/submit', authMiddleware, practiceController.submitSpacedReview);

// Student Feature 3: Explain My Mistake AI Chat
router.post('/explain-mistake', authMiddleware, practiceController.explainMistake);

// Student Feature 4: Class Leaderboard & Opt-In
router.get('/classes/:id/leaderboard', authMiddleware, practiceController.getClassLeaderboard);
router.patch('/profile/leaderboard-opt', authMiddleware, practiceController.toggleLeaderboardOptIn);

module.exports = router;
