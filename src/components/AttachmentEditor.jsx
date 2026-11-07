import { useEffect, useState } from 'react';
import {
  ATTACHMENT_ACCEPT,
  isImageAttachment,
  isPdfAttachment,
  isSafeAttachmentUrl, 
  MAX_ATTACHMENT_SIZE_MB,
  MAX_ATTACHMENTS,
  validateAttachmentFile,
} from '../utils/attachments';
import { formatFileSize } from '../utils/format';

function PendingPreview({ file }) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!String(file?.type ?? '').startsWith('image/')) {
      // oxlint-disable-next-line react/set-state-in-effect
      setPreviewUrl('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    // oxlint-disable-next-line react/set-state-in-effect
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (previewUrl) {
    return <img className="attachment-thumb" src={previewUrl} alt={file.name} />;
  }

  return (
    <span className="attachment-icon" aria-hidden="true">
      📄
    </span>
  );
}

export default function AttachmentEditor({
  attachments = [],
  pendingFiles = [],
  disabled = false,
  onAttachmentsChange,
  onPendingChange,
}) {
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (selected.length === 0) return;

    const errors = new Set();
    const next = [...pendingFiles];

    selected.forEach((file) => {
      if (attachments.length + next.length >= MAX_ATTACHMENTS) {
        errors.add(
          `Maksimal ${MAX_ATTACHMENTS} lampiran per request, termasuk lampiran yang sudah tersimpan.`,
        );
        return;
      }

      const validation = validateAttachmentFile(file);
      if (validation) {
        errors.add(validation);
        return;
      }

      next.push(file);
    });

    if (next.length > pendingFiles.length) {
      onPendingChange(next);
    }

    setError([...errors].join(' '));
  };

  const existingCount = attachments.length;
  const total = existingCount + pendingFiles.length;

  return (
    <div className="attachment-editor">
      <div className="attachment-editor-head">
        <label
          className={`btn btn-ghost btn-small attachment-picker ${
            disabled || total >= MAX_ATTACHMENTS ? 'is-disabled' : ''
          }`}
        >
          📎 Pilih File
          <input
            type="file"
            multiple
            accept={ATTACHMENT_ACCEPT}
            disabled={disabled || total >= MAX_ATTACHMENTS}
            onChange={handleFileChange}
          />
        </label>
        <small className="hint">
          Gambar JPG/PNG/WEBP/GIF atau PDF · maksimal {MAX_ATTACHMENT_SIZE_MB} MB/file ·
          maksimal {MAX_ATTACHMENTS} lampiran
        </small>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {total === 0 ? (
        <p className="hint">
          Belum ada lampiran. File akan diunggah saat tombol Simpan ditekan.
        </p>
      ) : (
        <div className="attachment-list">
          {attachments.map((attachment) => {
            const safeUrl = isSafeAttachmentUrl(attachment.url) ? attachment.url : '';
            const isImage = isImageAttachment(attachment);
            const fileKind = isImage
              ? 'Gambar'
              : isPdfAttachment(attachment)
                ? 'PDF'
                : 'File';

            return (
              <div className="attachment-item" key={attachment.id}>
                {isImage && safeUrl ? (
                  <a
                    className="attachment-thumb-link"
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Buka ${attachment.name}`}
                  >
                    <img
                      className="attachment-thumb"
                      src={safeUrl}
                      alt={attachment.name}
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <span className="attachment-icon" aria-hidden="true">
                    📄
                  </span>
                )}

                <div className="attachment-meta">
                  {safeUrl ? (
                    <a href={safeUrl} target="_blank" rel="noopener noreferrer">
                      {attachment.name}
                    </a>
                  ) : (
                    <strong>{attachment.name}</strong>
                  )}
                  <small>
                    {formatFileSize(attachment.size)} · {fileKind}
                  </small>
                </div>

                <button
                  type="button"
                  className="btn-action btn-del attachment-remove"
                  title="Hapus lampiran"
                  aria-label={`Hapus lampiran ${attachment.name}`}
                  disabled={disabled}
                  onClick={() =>
                    onAttachmentsChange(
                      attachments.filter((item) => item.id !== attachment.id),
                    )
                  }
                >
                  🗑️
                </button>
              </div>
            );
          })}

          {pendingFiles.map((file, index) => (
            <div
              className="attachment-item attachment-pending"
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
            >
              <PendingPreview file={file} />
              <div className="attachment-meta">
                <strong>{file.name}</strong>
                <small>{formatFileSize(file.size)} · Siap diunggah</small>
              </div>
              <button
                type="button"
                className="btn-action btn-del attachment-remove"
                title="Batalkan file"
                aria-label={`Batalkan file ${file.name}`}
                disabled={disabled}
                onClick={() =>
                  onPendingChange(pendingFiles.filter((_, fileIndex) => fileIndex !== index))
                }
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
