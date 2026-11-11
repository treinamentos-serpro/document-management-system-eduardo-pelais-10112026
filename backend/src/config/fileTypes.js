const path = require('node:path');

const fileTypes = new Map([
  ['.pdf', {
    mimeType: 'application/pdf',
    matches: (content) => content.subarray(0, 5).toString() === '%PDF-',
  }],
  ['.doc', {
    mimeType: 'application/msword',
    matches: (content) => content.subarray(0, 8).equals(Buffer.from('D0CF11E0A1B11AE1', 'hex')),
  }],
  ['.docx', {
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    matches: (content) => content.subarray(0, 4).equals(Buffer.from('504B0304', 'hex'))
      && content.includes(Buffer.from('[Content_Types].xml'))
      && content.includes(Buffer.from('word/document.xml')),
  }],
  ['.jpg', {
    mimeType: 'image/jpeg',
    matches: (content) => content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff,
  }],
  ['.jpeg', {
    mimeType: 'image/jpeg',
    matches: (content) => content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff,
  }],
  ['.png', {
    mimeType: 'image/png',
    matches: (content) => content.subarray(0, 8).equals(Buffer.from('89504E470D0A1A0A', 'hex')),
  }],
]);

function getFileType(originalName) {
  return fileTypes.get(path.extname(originalName.replace(/\\/g, '/')).toLowerCase()) || null;
}

function getUploadFileType(originalName, declaredMimeType) {
  const fileType = getFileType(originalName);
  return fileType?.mimeType === declaredMimeType ? fileType : null;
}

module.exports = {
  getFileType,
  getUploadFileType,
};