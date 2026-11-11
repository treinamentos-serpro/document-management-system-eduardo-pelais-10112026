import DownloadButton from './DownloadButton.jsx';

function formatSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function DocumentList({ documents, isLoading, error, onRetry }) {
  if (isLoading) {
    return <p className="list-message" role="status">Carregando documentos...</p>;
  }

  if (error) {
    return (
      <div className="list-message list-error" role="alert">
        <p>{error}</p>
        <button className="text-button" type="button" onClick={onRetry}>Tentar novamente</button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-mark" aria-hidden="true">—</span>
        <p>Nenhum documento por aqui.</p>
        <small>Os arquivos enviados aparecerão nesta lista.</small>
      </div>
    );
  }

  return (
    <ul className="document-list">
      {documents.map((document) => (
        <li className="document-row" key={document.id}>
          <span className="document-type" aria-hidden="true">
            {document.originalName.split('.').pop().slice(0, 4).toUpperCase()}
          </span>
          <div className="document-details">
            <strong title={document.originalName}>{document.originalName}</strong>
            <span>{formatSize(document.size)} <i aria-hidden="true">·</i> {formatDate(document.uploadedAt)}</span>
          </div>
          <DownloadButton document={document} />
        </li>
      ))}
    </ul>
  );
}