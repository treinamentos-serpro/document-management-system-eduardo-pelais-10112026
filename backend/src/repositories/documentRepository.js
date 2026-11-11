const fs = require('node:fs/promises');
const path = require('node:path');

const documents = new Map();

function save(document) {
  documents.set(document.id, document);
  return document;
}

function findById(id) {
  return documents.get(id) || null;
}

function findByOwner(owner) {
  return [...documents.values()]
    .filter((document) => document.owner === owner)
    .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt));
}

async function getStorageUsage(storageDirectory) {
  let entries;

  try {
    entries = await fs.readdir(storageDirectory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return 0;
    }
    throw error;
  }

  const fileSizes = await Promise.all(entries
    .filter((entry) => entry.isFile())
    .map(async (entry) => (await fs.stat(path.join(storageDirectory, entry.name))).size));

  return fileSizes.reduce((total, size) => total + size, 0);
}

module.exports = {
  save,
  findById,
  findByOwner,
  getStorageUsage,
};