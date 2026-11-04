import { useState } from 'react';
import { formatDateRange } from '../utils/format';
import { formatPicNames } from '../utils/pic';
import { buildNotePlan, defaultNoteText } from '../utils/schedule';
import { PriorityBadge } from './ScheduleBadge';

export default function ShiftImpactDialog({
  urgent,
  requests,
  candidates,
  defaultSelectedIds,
  busy,
  onConfirm,
  onCancel,
}) {
  const [selected, setSelected] = useState(
    () => new Set((defaultSelectedIds ?? []).map(String)),
  );

  const plan = buildNotePlan(requests, urgent, {
    selectedIds: [...selected],
  });
  const note = defaultNoteText(urgent);

  const toggle = (id) => {
    const key = String(id);
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={busy ? undefined : onCancel}>
      <div
        className="modal modal-wide shift-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shift-dialog-header">
          <div>
            <p className="eyebrow">Bentrok Jadwal</p>
            <h3 id="shift-dialog-title">
              {urgent.nama_orang_req || 'Request prioritas'} bentrok dengan jadwal proyek lain
            </h3>
            <p className="hint">
              {formatDateRange(urgent.mulai, urgent.estimasiSelesai)} ·{' '}
              {urgent.durasiHari} hari · {urgent.prioritas}
            </p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            disabled={busy}
            aria-label="Tutup"
          >
            ×
          </button>
        </div>

        {candidates.length === 0 ? (
          <p className="shift-empty">Tidak ada proyek lain yang bentrok. Jadwal aman.</p>
        ) : (
          <>
            <p className="shift-explanation">
              Pilih proyek yang diberi keterangan. Tanggal, durasi, dan roadmap proyek
              <strong> tidak diubah</strong>. Proyek yang dikunci tidak bisa dipilih, dan proyek
              Urgent lain tidak dicentang otomatis agar tidak terjadi perang prioritas.
            </p>

            <div className="shift-list">
              {candidates.map((item) => {
                const key = String(item.id);
                const checked = selected.has(key);
                const disabled = Boolean(item.jadwalTerkunci);

                return (
                  <div
                    className={`shift-item ${checked ? 'is-selected' : ''} ${
                      disabled ? 'is-locked' : ''
                    }`}
                    key={item.id}
                  >
                    <label className="shift-check">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled || busy}
                        onChange={() => toggle(item.id)}
                      />
                      <span>
                        <strong>{item.nama_orang_req || '(tanpa nama)'}</strong>
                        <span className="shift-item-meta">
                          {item.divisi.length > 0 ? item.divisi.join(', ') : 'Management'}
                          {item.PIC.length > 0
                            ? ` · PIC ${formatPicNames(item.PIC)}`
                            : ''}
                        </span>
                      </span>
                    </label>

                    <div className="shift-item-badges">
                      <PriorityBadge value={item.prioritas} />
                      {item.jadwalTerkunci && (
                        <span className="schedule-badge schedule-locked">🔒 Terkunci</span>
                      )}
                    </div>

                    <div className="shift-dates">
                      <span>{formatDateRange(item.mulai, item.estimasiSelesai)}</span>
                      <span className="muted">· tanggal tetap</span>
                    </div>

                    {checked && (
                      <span className="shift-note" title={note}>
                        Keterangan: {note}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="shift-summary">
              <strong>{plan.count} proyek</strong> akan diberi keterangan
              {plan.count > 0 ? ' · tanggal tidak diubah' : ''}
            </div>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => onConfirm({ selectedIds: [...selected] })}
          >
            {busy
              ? 'Menyimpan...'
              : plan.count > 0
                ? `Simpan & Tandai ${plan.count} Proyek`
                : 'Simpan Tanpa Keterangan'}
          </button>
        </div>
      </div>
    </div>
  );
}
