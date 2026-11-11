const express = require('express');
const documentController = require('../controllers/documentController');
const uploadSingleDocument = require('../middleware/upload');

const router = express.Router();

router.post('/upload', uploadSingleDocument, documentController.upload);
router.get('/documents', documentController.list);
router.get('/documents/:id/download', documentController.download);

module.exports = router;