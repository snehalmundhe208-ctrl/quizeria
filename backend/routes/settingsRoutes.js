const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authMiddleware } = require('../middleware/auth');

router.put('/profile', authMiddleware, settingsController.updateProfile);
router.put('/password', authMiddleware, settingsController.changePassword);

module.exports = router;
