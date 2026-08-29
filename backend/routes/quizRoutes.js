const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const attemptController = require('../controllers/attemptController');
const { authMiddleware, teacherMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, teacherMiddleware, quizController.createQuiz);
router.get('/', authMiddleware, teacherMiddleware, quizController.getQuizzes);

// Attempts and analytics routes (teacher/admin scope)
router.get('/attempts/all', authMiddleware, teacherMiddleware, attemptController.getAttemptsForAdmin);
router.get('/attempts/:id/review', authMiddleware, teacherMiddleware, attemptController.getAttemptReviewDetails);
router.post('/attempts/:id/review', authMiddleware, teacherMiddleware, attemptController.submitShortAnswerGrades);
router.get('/:id/analytics', authMiddleware, teacherMiddleware, attemptController.getQuizAnalytics);

router.get('/:id', authMiddleware, teacherMiddleware, quizController.getQuizById);
router.put('/:id', authMiddleware, teacherMiddleware, quizController.updateQuiz);
router.delete('/:id', authMiddleware, teacherMiddleware, quizController.deleteQuiz);

router.post('/:id/publish', authMiddleware, teacherMiddleware, quizController.publishQuiz);
router.post('/:id/regenerate-link', authMiddleware, teacherMiddleware, quizController.regenerateShareLink);
router.post('/:id/toggle-link', authMiddleware, teacherMiddleware, quizController.toggleShareLinkActive);

module.exports = router;
