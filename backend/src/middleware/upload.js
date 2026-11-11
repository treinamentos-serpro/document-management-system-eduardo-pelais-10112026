const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');
const AppError = require('../errors/appError');
const getStorageDirectory = require('../config/storage');
const { getUploadFileType } = require('../config/fileTypes');

const storage = multer.diskStorage({
  destination(req, file, callback) {
    const storageDirectory = getStorageDirectory();
    fs.mkdir(storageDirectory, { recursive: true }, (error) => {
      callback(error, storageDirectory);
    });
  },
  filename(req, file, callback) {
    const normalizedName = path.posix.basename(file.originalname.replace(/\\/g, '/'));
    const extension = path.extname(normalizedName).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 0,
    parts: 2,
  },
  fileFilter(req, file, callback) {
    const normalizedName = path.posix.basename(file.originalname.replace(/\\/g, '/'));
    if (!getUploadFileType(normalizedName, file.mimetype)) {
      callback(new AppError(400, 'INVALID_FILE_TYPE', 'O tipo de arquivo não é permitido.'));
      return;
    }

    callback(null, true);
  },
});

module.exports = upload.single('file');