const path = require('node:path');
const AppError = require('../errors/appError');
const documentService = require('../services/documentService');

function upload(req, res, next) {
  if (!req.file) {
    next(new AppError(400, 'MISSING_FILE', 'Envie um arquivo no campo "file".'));
    return;
  }

  res.status(201).json(documentService.createDocument(req.file));
}

function list(req, res) {
  res.status(200).json({ documents: documentService.listDocuments() });
}

function download(req, res, next) {
  const document = documentService.findDocumentForDownload(req.params.id);

  if (!document) {
    next(new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.'));
    return;
  }

  const downloadName = path.posix
    .basename(document.originalName.replace(/\\/g, '/'))
    .replace(/[\u0000-\u001f\u007f]/g, '_') || 'document';

  res.download(document.filePath, downloadName, {
    headers: {
      'Content-Type': document.mimeType,
      'X-Content-Type-Options': 'nosniff',
    },
  }, (error) => {
    if (!error) {
      return;
    }

    if (res.headersSent) {
      next(error);
      return;
    }

    if (error.code === 'ENOENT') {
      next(new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.'));
      return;
    }

    next(new AppError(500, 'INTERNAL_ERROR', 'Não foi possível baixar o documento.'));
  });
}

module.exports = {
  upload,
  list,
  download,
};