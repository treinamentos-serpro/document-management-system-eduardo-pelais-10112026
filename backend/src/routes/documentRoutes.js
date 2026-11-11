const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const multer = require('multer');
const documentController = require('../controllers/documentController');

const storageDirectory = path.resolve(
  process.env.DMS_STORAGE_DIR || path.resolve(__dirname, '../../storage')
);
fs.mkdirSync(storageDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, storageDirectory),
    filename: (_req, _file, callback) => callback(null, randomUUID())
  })
});

const downloadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false
});

const router = express.Router();
router.post('/upload', upload.single('file'), documentController.upload);
router.get('/documents', documentController.list);
router.get('/documents/:id/download', downloadRateLimit, documentController.download);

module.exports = router;
