const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const attemptController = require('../controllers/attemptController');
const paperController = require('../controllers/paperController');
const { authMiddleware } = require('../middleware/auth');

// Quiz metadata loading route
router.get('/quiz/:shareCode', quizController.getPublicQuiz);

// Printable Paper Exporter route (unauthenticated student copy, mode=answer_key blocked in controller if unauthenticated)
router.get('/papers/:id/export', paperController.exportPaperHtml);

// Student Attempt management routes (require authenticated student)
router.get('/attempts/my-attempts', authMiddleware, attemptController.getMyAttempts);
router.post('/quiz/:shareCode/start', authMiddleware, attemptController.startAttempt);
router.patch('/attempts/:attemptId/answers', authMiddleware, attemptController.saveAnswers);
router.get('/attempts/:attemptId/answers/load', authMiddleware, attemptController.loadAttemptAnswers);
router.post('/attempts/:attemptId/submit', authMiddleware, attemptController.submitAttempt);
router.get('/attempts/:attemptId/result', authMiddleware, attemptController.getAttemptResult);

module.exports = router;
