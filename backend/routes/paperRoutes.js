const express = require('express');
const router = express.Router();
const paperController = require('../controllers/paperController');
const { authMiddleware, teacherMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, teacherMiddleware, paperController.generatePaper);
router.get('/', authMiddleware, teacherMiddleware, paperController.getPapers);
router.get('/:id', authMiddleware, teacherMiddleware, paperController.getPaperById);
router.get('/:id/export', authMiddleware, teacherMiddleware, paperController.exportPaperHtml);
router.put('/:id', authMiddleware, teacherMiddleware, paperController.updatePaper);
router.delete('/:id', authMiddleware, teacherMiddleware, paperController.deletePaper);

router.post('/:id/regenerate-section', authMiddleware, teacherMiddleware, paperController.regenerateSection);

module.exports = router;
