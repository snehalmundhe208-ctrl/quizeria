const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const attemptController = require('../controllers/attemptController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, quizController.createQuiz);
router.get('/', authMiddleware, quizController.getQuizzes);

// Attempts and analytics routes
router.get('/attempts/all', authMiddleware, attemptController.getAttemptsForAdmin);
router.get('/attempts/:id/review', authMiddleware, attemptController.getAttemptReviewDetails);
router.post('/attempts/:id/review', authMiddleware, attemptController.submitShortAnswerGrades);
router.get('/:id/analytics', authMiddleware, attemptController.getQuizAnalytics);

router.get('/:id', authMiddleware, quizController.getQuizById);
router.put('/:id', authMiddleware, quizController.updateQuiz);
router.delete('/:id', authMiddleware, quizController.deleteQuiz);

router.post('/:id/publish', authMiddleware, quizController.publishQuiz);
router.post('/:id/regenerate-link', authMiddleware, quizController.regenerateShareLink);
router.post('/:id/toggle-link', authMiddleware, quizController.toggleShareLinkActive);

module.exports = router;
