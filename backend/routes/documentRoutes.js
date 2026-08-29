const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authMiddleware, teacherMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/upload', authMiddleware, teacherMiddleware, upload.single('file'), documentController.uploadDocument);
router.post('/:id/process', authMiddleware, teacherMiddleware, documentController.processDocument);
router.get('/', authMiddleware, teacherMiddleware, documentController.getDocuments);
router.get('/:id', authMiddleware, teacherMiddleware, documentController.getDocumentById);
router.delete('/:id', authMiddleware, teacherMiddleware, documentController.deleteDocument);

module.exports = router;
