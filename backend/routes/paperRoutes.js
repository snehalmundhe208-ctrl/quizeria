const express = require('express');
const router = express.Router();
const paperController = require('../controllers/paperController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, paperController.generatePaper);
router.get('/', authMiddleware, paperController.getPapers);
router.get('/:id', authMiddleware, paperController.getPaperById);
router.get('/:id/export', authMiddleware, paperController.exportPaperHtml);
router.put('/:id', authMiddleware, paperController.updatePaper);
router.delete('/:id', authMiddleware, paperController.deletePaper);

router.post('/:id/regenerate-section', authMiddleware, paperController.regenerateSection);

module.exports = router;
