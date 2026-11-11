const API_BASE_URL = '/api';

async function parseResponse(response) {
  if (!response.ok) {
    let message = 'Não foi possível concluir a solicitação.';

    try {
      const payload = await response.json();
      message = payload.error?.message || message;
    } catch {
      message = `${message} (${response.status})`;
    }

    throw new Error(message);
  }

  return response;
}

export async function listDocuments() {
  const response = await parseResponse(await fetch(`${API_BASE_URL}/documents`));
  const payload = await response.json();
  return payload.documents;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await parseResponse(await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  }));

  return response.json();
}

export async function downloadDocument(id) {
  const response = await parseResponse(await fetch(
    `${API_BASE_URL}/documents/${encodeURIComponent(id)}/download`
  ));

  return response.blob();
}