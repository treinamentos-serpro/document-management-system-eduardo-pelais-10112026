const { test } = require('node:test');
const assert = require('node:assert/strict');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');

const previousStorageDirectory = process.env.DMS_STORAGE_DIR;
const storageDirectory = fsSync.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
process.env.DMS_STORAGE_DIR = storageDirectory;

const app = require('../src/app');

function createUploadForm(name, content, type) {
  const form = new FormData();
  form.append('file', new Blob([content], { type }), name);
  return form;
}

test('API de documentos cobre upload, listagem, download e validações', async (t) => {
  const previousOwner = process.env.DMS_DEFAULT_OWNER;
  const previousStorageLimit = process.env.DMS_STORAGE_MAX_BYTES;
  const previousUploadLimit = process.env.DMS_UPLOADS_PER_MINUTE;
  const testOwner = `test-${randomUUID()}`;

  process.env.DMS_DEFAULT_OWNER = testOwner;
  const server = app.listen(0);
  await once(server, 'listening');

  t.after(async () => {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections?.();
    });

    await fs.rm(storageDirectory, { recursive: true, force: true });

    if (previousOwner === undefined) {
      delete process.env.DMS_DEFAULT_OWNER;
    } else {
      process.env.DMS_DEFAULT_OWNER = previousOwner;
    }

    if (previousStorageDirectory === undefined) {
      delete process.env.DMS_STORAGE_DIR;
    } else {
      process.env.DMS_STORAGE_DIR = previousStorageDirectory;
    }

    if (previousStorageLimit === undefined) {
      delete process.env.DMS_STORAGE_MAX_BYTES;
    } else {
      process.env.DMS_STORAGE_MAX_BYTES = previousStorageLimit;
    }

    if (previousUploadLimit === undefined) {
      delete process.env.DMS_UPLOADS_PER_MINUTE;
    } else {
      process.env.DMS_UPLOADS_PER_MINUTE = previousUploadLimit;
    }
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const fileContent = Buffer.from('%PDF-1.4\nconteudo de teste\n');
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: createUploadForm('relatorio.pdf', fileContent, 'application/pdf'),
  });

  const document = await uploadResponse.json();
  assert.equal(uploadResponse.status, 201, JSON.stringify(document));
  assert.equal(document.originalName, 'relatorio.pdf');
  assert.equal(document.size, fileContent.length);
  assert.equal(document.owner, testOwner);
  assert.ok(document.id);
  assert.ok(document.uploadedAt);
  assert.equal(Object.hasOwn(document, 'storageName'), false);

  const listResponse = await fetch(`${baseUrl}/documents`);
  assert.equal(listResponse.status, 200);
  assert.deepEqual((await listResponse.json()).documents, [document]);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.equal(downloadResponse.status, 200);
  assert.equal(downloadResponse.headers.get('content-type'), 'application/pdf');
  assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);
  assert.deepEqual(Buffer.from(await downloadResponse.arrayBuffer()), fileContent);

  process.env.DMS_DEFAULT_OWNER = `${testOwner}-other`;
  const otherOwnerList = await fetch(`${baseUrl}/documents`);
  assert.deepEqual((await otherOwnerList.json()).documents, []);
  const otherOwnerDownload = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.equal(otherOwnerDownload.status, 404);

  process.env.DMS_DEFAULT_OWNER = testOwner;
  const missingFile = await fetch(`${baseUrl}/upload`, { method: 'POST' });
  assert.equal(missingFile.status, 400);
  assert.equal((await missingFile.json()).error.code, 'MISSING_FILE');

  const invalidType = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: createUploadForm('script.txt', 'texto', 'text/plain'),
  });
  assert.equal(invalidType.status, 400);
  assert.equal((await invalidType.json()).error.code, 'INVALID_FILE_TYPE');

  const invalidContent = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: createUploadForm('fake.pdf', 'não é um PDF', 'application/pdf'),
  });
  assert.equal(invalidContent.status, 400);
  assert.equal((await invalidContent.json()).error.code, 'INVALID_FILE_CONTENT');

  process.env.DMS_STORAGE_MAX_BYTES = String(fileContent.length);
  const quotaExceeded = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: createUploadForm('outro.pdf', Buffer.from('%PDF-1.4\nsegundo\n'), 'application/pdf'),
  });
  assert.equal(quotaExceeded.status, 413);
  assert.equal((await quotaExceeded.json()).error.code, 'STORAGE_QUOTA_EXCEEDED');
  delete process.env.DMS_STORAGE_MAX_BYTES;

  const oversized = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: createUploadForm('large.pdf', Buffer.alloc(10 * 1024 * 1024 + 1), 'application/pdf'),
  });
  assert.equal(oversized.status, 413);
  assert.equal((await oversized.json()).error.code, 'FILE_TOO_LARGE');

  const notFound = await fetch(`${baseUrl}/documents/${randomUUID()}/download`);
  assert.equal(notFound.status, 404);
  assert.equal((await notFound.json()).error.code, 'DOCUMENT_NOT_FOUND');

  const unknownRoute = await fetch(`${baseUrl}/unknown`);
  assert.equal(unknownRoute.status, 404);
  assert.equal((await unknownRoute.json()).error.code, 'ROUTE_NOT_FOUND');

  process.env.DMS_UPLOADS_PER_MINUTE = '1';
  const rateLimitedUpload = await fetch(`${baseUrl}/upload`, { method: 'POST' });
  assert.equal(rateLimitedUpload.status, 429);
  assert.equal((await rateLimitedUpload.json()).error.code, 'UPLOAD_RATE_LIMITED');
});