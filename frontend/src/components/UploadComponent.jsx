import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentApi.js';

const acceptedFiles = '.pdf,.doc,.docx,.jpg,.jpeg,.png';

export default function UploadComponent({ onUploadComplete }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      setError('Selecione um arquivo para continuar.');
      return;
    }

    setError('');
    setIsUploading(true);

    try {
      await uploadDocument(file);
      setFile(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      await onUploadComplete();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(event) {
    setFile(event.target.files?.[0] || null);
    setError('');
  }

  return (
    <form className="upload-panel" onSubmit={handleSubmit}>
      <div className="upload-panel-heading">
        <span className="upload-symbol" aria-hidden="true">+</span>
        <div>
          <p className="eyebrow">NOVO DOCUMENTO</p>
          <h2>Adicionar arquivo</h2>
        </div>
      </div>

      <label className={`file-picker${file ? ' has-file' : ''}`} htmlFor="document-file">
        <span className="file-picker-icon" aria-hidden="true">↑</span>
        <span className="file-picker-copy">
          <strong>{file ? file.name : 'Escolher arquivo'}</strong>
          <small>{file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'PDF, DOC, DOCX, JPG ou PNG'}</small>
        </span>
        <input
          ref={inputRef}
          id="document-file"
          type="file"
          accept={acceptedFiles}
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </label>

      <p className="upload-limit">Tamanho máximo: 10 MB</p>

      {error && <p className="form-error" role="alert">{error}</p>}

      <button className="primary-button" type="submit" disabled={isUploading}>
        {isUploading ? 'Enviando...' : 'Enviar documento'}
        {!isUploading && <span aria-hidden="true">↗</span>}
      </button>
    </form>
  );
}