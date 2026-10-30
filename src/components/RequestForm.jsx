import { DIVISI_OPTIONS, STATUS_OPTIONS } from '../constants';

export default function RequestForm({ form, editing, saving, onChange, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="card-form">
      <h3>{editing ? '✏️ Edit Request' : '+ Tambah Request Baru'}</h3>

      <div className="form-grid">
        <label className="field">
          <span>Nama Requester *</span>
          <input
            type="text"
            placeholder="Nama orang yang request"
            required
            value={form.nama_orang_req}
            onChange={(event) => onChange('nama_orang_req', event.target.value)}
          />
        </label>

        <label className="field">
          <span>Divisi</span>
          <select value={form.divisi} onChange={(event) => onChange('divisi', event.target.value)}>
            <option value="">Pilih Divisi</option>
            {DIVISI_OPTIONS.map((divisi) => (
              <option key={divisi} value={divisi}>
                {divisi}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>Deskripsi Masalah *</span>
        <textarea
          rows={4}
          placeholder="Jelaskan masalah atau request secara detail"
          required
          value={form.deskripsi}
          onChange={(event) => onChange('deskripsi', event.target.value)}
        />
      </label>

      <div className="form-grid">
        <label className="field">
          <span>PIC</span>
          <input
            type="text"
            placeholder="Nama PIC (opsional)"
            value={form.PIC}
            onChange={(event) => onChange('PIC', event.target.value)}
          />
        </label>

        <label className="field">
          <span>Status</span>
          <select value={form.status} onChange={(event) => onChange('status', event.target.value)}>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={form.is_priority}
          onChange={(event) => onChange('is_priority', event.target.checked)}
        />
        <span>⭐ Tandai sebagai Prioritas Utama (Jalur VIP)</span>
      </label>

      <div className="form-actions">
        <button
          type="submit"
          className={`btn ${editing ? 'btn-warning' : 'btn-success'}`}
          disabled={saving}
        >
          {saving ? 'Menyimpan...' : editing ? 'Update Request' : 'Simpan Request'}
        </button>

        {editing && (
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
            Batal Edit
          </button>
        )}
      </div>
    </form>
  );
}
