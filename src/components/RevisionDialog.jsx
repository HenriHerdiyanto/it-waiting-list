import { useState } from 'react';

export default function RevisionDialog({ request, busy, onConfirm, onCancel }) {
  const [description, setDescription] = useState(() => request?.deskripsiRevisi ?? '');
  const [error, setError] = useState('');

  const trimmed = description.trim();

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!trimmed) {
      setError('Deskripsi revisi wajib diisi.');
      return;
    }

    onConfirm(trimmed);
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={busy ? undefined : onCancel}
    >
      <form
        className="modal revision-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="revision-dialog-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h3 id="revision-dialog-title">Ubah ke Revisi</h3>
        <p>
          Sebutkan kesalahan atau perbaikan yang perlu dikerjakan untuk{' '}
          <strong>{request?.nama_orang_req || 'request ini'}</strong>.
        </p>

        <label className="field revision-field">
          <span>Deskripsi Revisi *</span>
          <textarea
            rows={4}
            autoFocus
            placeholder="Jelaskan kesalahan atau perbaikan yang perlu dikerjakan"
            value={description}
            disabled={busy}
            onChange={(event) => {
              setDescription(event.target.value);
              if (error) setError('');
            }}
          />
        </label>

        {error && (
          <p className="revision-error" role="alert">
            {error}
          </p>
        )}

        <p className="hint revision-hint">
          Tanggal selesai sebelumnya tetap tersimpan. Tanggal dan roadmap tidak diubah otomatis.
        </p>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Batal
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || !trimmed}>
            {busy ? 'Menyimpan...' : 'Simpan Revisi'}
          </button>
        </div>
      </form>
    </div>
  );
}
