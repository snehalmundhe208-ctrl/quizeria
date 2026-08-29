const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const attemptController = require('../controllers/attemptController');
const paperController = require('../controllers/paperController');

// Quiz metadata loading route
router.get('/quiz/:shareCode', quizController.getPublicQuiz);

// Printable Paper Exporter route
router.get('/papers/:id/export', paperController.exportPaperHtml);

// Attempt management routes
router.post('/quiz/:shareCode/start', attemptController.startAttempt);
router.patch('/attempts/:attemptId/answers', attemptController.saveAnswers);
router.get('/attempts/:attemptId/answers/load', attemptController.loadAttemptAnswers);
router.post('/attempts/:attemptId/submit', attemptController.submitAttempt);
router.get('/attempts/:attemptId/result', attemptController.getAttemptResult);

module.exports = router;
