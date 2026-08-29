const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware, teacherMiddleware } = require('../middleware/auth');

router.get('/stats', authMiddleware, teacherMiddleware, dashboardController.getStats);

module.exports = router;
