import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');

  async function refreshDocuments() {
    setIsLoading(true);
    setLoadError('');

    try {
      setDocuments(await listDocuments());
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    listDocuments()
      .then((result) => {
        if (isActive) {
          setDocuments(result);
          setLoadError('');
        }
      })
      .catch((error) => {
        if (isActive) {
          setLoadError(error.message);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function handleUploadComplete() {
    setNotice('Documento enviado com sucesso.');
    await refreshDocuments();
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <a className="brand" href="/" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span className="brand-name">arquivo<span>+</span></span>
        </a>
        <span className="connection-state"><span /> Armazenamento local</span>
      </header>

      <section className="page-heading" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">ESPAÇO DE TRABALHO</p>
          <h1 id="page-title">Documentos</h1>
        </div>
        <p className="document-total">
          <strong>{documents.length.toString().padStart(2, '0')}</strong>
          <span>{documents.length === 1 ? 'arquivo' : 'arquivos'}</span>
        </p>
      </section>

      {notice && <p className="global-notice" role="status">{notice}</p>}

      <div className="content-grid">
        <aside className="upload-column" aria-label="Enviar documento">
          <UploadComponent onUploadComplete={handleUploadComplete} />
        </aside>

        <section className="documents-column" aria-labelledby="documents-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">BIBLIOTECA</p>
              <h2 id="documents-title">Todos os arquivos</h2>
            </div>
            <button
              className="refresh-button"
              type="button"
              onClick={refreshDocuments}
              disabled={isLoading}
              aria-label="Atualizar lista de documentos"
              title="Atualizar lista"
            >
              ↻
            </button>
          </div>

          <DocumentList
            documents={documents}
            isLoading={isLoading}
            error={loadError}
            onRetry={refreshDocuments}
          />
        </section>
      </div>

      <footer className="footer-note">
        <span>ARQUIVO+ <span aria-hidden="true">/</span> DOCUMENTOS</span>
        <span>Arquivos armazenados neste dispositivo</span>
      </footer>
    </main>
  );
}