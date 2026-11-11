const AppError = require('../errors/appError');
const documentService = require('../services/documentService');

async function upload(req, res) {
  if (!req.file) {
    throw new AppError(400, 'MISSING_FILE', 'Envie um arquivo no campo "file".');
  }

  const document = await documentService.createDocument(req.file);
  res.status(201).json(document);
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

  res.download(document.filePath, document.originalName, {
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