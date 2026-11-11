const { randomUUID } = require('node:crypto');
const path = require('node:path');
const documentRepository = require('../repositories/documentRepository');
const storageDirectory = require('../config/storage');

function getCurrentOwner() {
  return process.env.DMS_DEFAULT_OWNER || 'local-user';
}

function toPublicDocument(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
  };
}

function createDocument(file) {
  const originalName = path.posix
    .basename(file.originalname.replace(/\\/g, '/'))
    .replace(/[\u0000-\u001f\u007f]/g, '_') || 'document';
  const document = {
    id: randomUUID(),
    originalName,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner: getCurrentOwner(),
    storageName: file.filename,
    mimeType: file.mimetype,
  };

  documentRepository.save(document);
  return toPublicDocument(document);
}

function listDocuments() {
  return documentRepository
    .findByOwner(getCurrentOwner())
    .map(toPublicDocument);
}

function findDocumentForDownload(id) {
  const document = documentRepository.findById(id);

  if (!document || document.owner !== getCurrentOwner()) {
    return null;
  }

  const filePath = path.resolve(storageDirectory, document.storageName);
  if (!filePath.startsWith(`${storageDirectory}${path.sep}`)) {
    return null;
  }

  return {
    ...toPublicDocument(document),
    filePath,
    mimeType: document.mimeType,
  };
}

module.exports = {
  createDocument,
  listDocuments,
  findDocumentForDownload,
};