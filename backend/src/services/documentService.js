const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const AppError = require('../errors/appError');
const getStorageDirectory = require('../config/storage');
const { getFileType } = require('../config/fileTypes');
const documentRepository = require('../repositories/documentRepository');

function getCurrentOwner() {
  return process.env.DMS_DEFAULT_OWNER || 'local-user';
}

function getStorageLimit() {
  const configuredLimit = Number(process.env.DMS_STORAGE_MAX_BYTES);
  return Number.isSafeInteger(configuredLimit) && configuredLimit > 0
    ? configuredLimit
    : 1024 * 1024 * 1024;
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

async function removeUploadedFile(filePath) {
  await fs.unlink(filePath).catch(() => {});
}

async function createDocument(file) {
  try {
    const fileType = getFileType(file.originalname);
    const content = await fs.readFile(file.path);

    if (!fileType || !fileType.matches(content)) {
      throw new AppError(400, 'INVALID_FILE_CONTENT', 'O conteúdo não corresponde ao tipo de arquivo informado.');
    }

    const storageDirectory = getStorageDirectory();
    const storageUsage = await documentRepository.getStorageUsage(storageDirectory);
    if (storageUsage > getStorageLimit()) {
      throw new AppError(413, 'STORAGE_QUOTA_EXCEEDED', 'O armazenamento local atingiu o limite configurado.');
    }

    const originalName = path.posix
      .basename(file.originalname.replace(/\\/g, '/'))
      .replace(/[\u0000-\u001f\u007f]/g, '_') || 'document';
    const document = {
      id: randomUUID(),
      originalName,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      owner: getCurrentOwner(),
      storageName: path.basename(file.filename),
      mimeType: fileType.mimeType,
    };

    documentRepository.save(document);
    return toPublicDocument(document);
  } catch (error) {
    await removeUploadedFile(file.path);
    throw error;
  }
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

  const storageDirectory = getStorageDirectory();
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