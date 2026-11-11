const path = require('node:path');

const defaultStorageDirectory = path.resolve(__dirname, '../../storage');

function getStorageDirectory() {
  return path.resolve(process.env.DMS_STORAGE_DIR || defaultStorageDirectory);
}

module.exports = getStorageDirectory;