const documentRepository = require('../repositories/documentRepository');

function saveUpload(file, owner) {
  const metadata = {
    id: file.filename,
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner
  };

  documentRepository.save({ metadata, storedName: file.filename });
  return metadata;
}

function listDocuments() {
  return documentRepository.findAll();
}

function findDocument(id) {
  return documentRepository.findById(id);
}

module.exports = { saveUpload, listDocuments, findDocument };
