const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/upload', authMiddleware, upload.single('file'), documentController.uploadDocument);
router.post('/:id/process', authMiddleware, documentController.processDocument);
router.get('/', authMiddleware, documentController.getDocuments);
router.get('/:id', authMiddleware, documentController.getDocumentById);
router.delete('/:id', authMiddleware, documentController.deleteDocument);

module.exports = router;
