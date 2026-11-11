const { after, before, test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');

const storageDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
process.env.DMS_STORAGE_DIR = storageDirectory;
const app = require('../src/app');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    server.close();
    await once(server, 'close');
  }
  fs.rmSync(storageDirectory, { recursive: true, force: true });
  delete process.env.DMS_STORAGE_DIR;
});

// Teste de fumaça do seed: garante que o app Express foi exportado.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('upload, listagem e download de documentos', async () => {
  const contents = 'conteúdo do documento';
  const form = new FormData();
  form.append('file', new Blob([contents], { type: 'text/plain' }), 'documento.txt');

  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'x-user-id': 'usuario-teste' },
    body: form
  });
  assert.strictEqual(uploadResponse.status, 201);

  const metadata = await uploadResponse.json();
  assert.strictEqual(metadata.originalName, 'documento.txt');
  assert.strictEqual(metadata.size, Buffer.byteLength(contents));
  assert.strictEqual(metadata.owner, 'usuario-teste');
  assert.ok(metadata.id);
  assert.ok(metadata.uploadedAt);
  assert.ok(fs.existsSync(path.join(storageDirectory, metadata.id)));

  const listResponse = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(listResponse.status, 200);
  assert.deepStrictEqual(await listResponse.json(), [metadata]);

  const downloadResponse = await fetch(`${baseUrl}/documents/${metadata.id}/download`);
  assert.strictEqual(downloadResponse.status, 200);
  assert.strictEqual(await downloadResponse.text(), contents);

  const missingDocumentResponse = await fetch(`${baseUrl}/documents/inexistente/download`);
  assert.strictEqual(missingDocumentResponse.status, 404);

  for (let requestNumber = 2; requestNumber < 100; requestNumber += 1) {
    const response = await fetch(`${baseUrl}/documents/inexistente/download`);
    assert.strictEqual(response.status, 404);
  }

  const rateLimitedResponse = await fetch(`${baseUrl}/documents/inexistente/download`);
  assert.strictEqual(rateLimitedResponse.status, 429);
});

test('upload rejeita requisição sem arquivo', async () => {
  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: new FormData()
  });

  assert.strictEqual(response.status, 400);
});
