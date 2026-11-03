import { useState } from 'react';
import { SHIFT_WARNING_DAYS, SHIFT_WARNING_PROJECTS } from '../constants';
import { formatDate, formatDateRange } from '../utils/format';
import { buildShiftPlan, defaultShiftReason } from '../utils/schedule';
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
  const [reasons, setReasons] = useState(() =>
    Object.fromEntries(
      candidates.map((item) => [String(item.id), defaultShiftReason(urgent)]),
    ),
  );

  const plan = buildShiftPlan(requests, urgent, {
    selectedIds: [...selected],
    reasons,
  });

  const planById = new Map(plan.items.map((entry) => [String(entry.id), entry]));
  const showBigWarning =
    plan.count > SHIFT_WARNING_PROJECTS || plan.totalDays > SHIFT_WARNING_DAYS;

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
            <p className="eyebrow">Dampak Prioritas</p>
            <h3 id="shift-dialog-title">
              {urgent.nama_orang_req || 'Request prioritas'} akan menggeser jadwal
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
              Pilih proyek yang ikut digeser. Proyek yang dikunci tidak bisa dipilih. Proyek
              Urgent lain tidak dicentang otomatis agar tidak terjadi perang prioritas.
            </p>

            <div className="shift-list">
              {candidates.map((item) => {
                const key = String(item.id);
                const entry = planById.get(key);
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
                          {item.PIC ? ` · PIC ${item.PIC}` : ''}
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
                      {checked && entry && (
                        <>
                          <span className="shift-arrow">→</span>
                          <strong>{formatDateRange(entry.after.mulai, entry.after.estimasiSelesai)}</strong>
                          <span className="shift-delta">+{entry.daysShifted} hari</span>
                        </>
                      )}
                    </div>

                    {checked && entry && (
                      <label className="shift-reason">
                        <span>Alasan tergeser</span>
                        <input
                          type="text"
                          value={reasons[key] ?? ''}
                          disabled={busy}
                          placeholder="Kenapa jadwal proyek ini bergeser?"
                          onChange={(event) =>
                            setReasons((previous) => ({
                              ...previous,
                              [key]: event.target.value,
                            }))
                          }
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            {showBigWarning && (
              <p className="roadmap-warning">
                ⚠️ Dampak cukup besar: {plan.count} proyek dan total {plan.totalDays} hari.
                Periksa kembali pilihan Anda sebelum menyimpan.
              </p>
            )}

            <div className="shift-summary">
              <strong>{plan.count} proyek</strong> akan digeser
              {plan.totalDays > 0 ? ` · total ${plan.totalDays} hari` : ''}
              {plan.items[0] ? ` · mulai ${formatDate(plan.items[0].after.mulai)}` : ''}
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
            onClick={() => onConfirm({ selectedIds: [...selected], reasons })}
          >
            {busy
              ? 'Menyimpan...'
              : plan.count > 0
                ? `Simpan & Geser ${plan.count} Proyek`
                : 'Simpan Tanpa Geser'}
          </button>
        </div>
      </div>
    </div>
  );
}
