const documents = new Map();

function save(document) {
  documents.set(document.metadata.id, document);
  return document.metadata;
}

function findAll() {
  return [...documents.values()].map(({ metadata }) => metadata);
}

function findById(id) {
  return documents.get(id) || null;
}

module.exports = { save, findAll, findById };
