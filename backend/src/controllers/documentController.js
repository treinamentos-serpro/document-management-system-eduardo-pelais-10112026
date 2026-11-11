const path = require('node:path');
const documentService = require('../services/documentService');
const storageDirectory = path.resolve(
  process.env.DMS_STORAGE_DIR || path.resolve(__dirname, '../../storage')
);

function upload(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'É necessário enviar um arquivo.' });
  }

  const owner = req.get('x-user-id') || 'anonymous';
  return res.status(201).json(documentService.saveUpload(req.file, owner));
}

function list(_req, res) {
  return res.json(documentService.listDocuments());
}

function download(req, res) {
  const document = documentService.findDocument(req.params.id);
  if (!document) {
    return res.status(404).json({ error: 'Documento não encontrado.' });
  }

  const filePath = path.join(storageDirectory, path.basename(document.storedName));
  return res.download(filePath, document.metadata.originalName, (error) => {
    if (error && !res.headersSent) {
      res.status(404).json({ error: 'Documento não encontrado.' });
    }
  });
}

module.exports = { upload, list, download };
