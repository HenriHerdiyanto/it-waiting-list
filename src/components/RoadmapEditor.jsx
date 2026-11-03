import {
  balanceRoadmap,
  createRoadmapStep,
  generateDailyRoadmap,
  roadmapProgress,
  syncRoadmapDates,
  totalRoadmapDays,
} from '../utils/roadmap';
import { formatDateShort } from '../utils/format';

const STEP_STATUS_OPTIONS = [
  { value: 'todo', label: 'Belum' },
  { value: 'progress', label: 'On Progress' },
  { value: 'done', label: 'Selesai' },
  { value: 'skipped', label: 'Dilewati' },
];

export default function RoadmapEditor({ roadmap = [], mulai, durasiHari, disabled, onChange }) {
  const target = Math.max(1, Math.floor(Number(durasiHari) || 1));
  const total = totalRoadmapDays(roadmap);
  const progress = roadmapProgress(roadmap);
  const isBalanced = roadmap.length === 0 || total === target;

  const commit = (next) => {
    onChange(syncRoadmapDates(next, mulai));
  };

  const updateStep = (id, patch) => {
    commit(roadmap.map((step) => (step.id === id ? { ...step, ...patch } : step)));
  };

  const removeStep = (id) => {
    commit(roadmap.filter((step) => step.id !== id));
  };

  const moveStep = (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= roadmap.length) return;

    const next = [...roadmap];
    const [current] = next.splice(index, 1);
    next.splice(targetIndex, 0, current);
    commit(next);
  };

  return (
    <div className="roadmap-editor">
      <div className="roadmap-toolbar">
        <div>
          <strong>Roadmap</strong>
          <p className="hint">
            Total {total} dari {target} hari
            {roadmap.length > 0 ? ` · ${progress.percent}% selesai` : ' · belum ada langkah'}
          </p>
        </div>

        <div className="roadmap-toolbar-actions">
          <button
            type="button"
            className="btn btn-ghost btn-small"
            disabled={disabled}
            onClick={() => commit(generateDailyRoadmap(mulai, target))}
          >
            ⚡ Generate harian
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-small"
            disabled={disabled}
            onClick={() => commit([...roadmap, createRoadmapStep(roadmap.length)])}
          >
            + Langkah
          </button>

          {roadmap.length > 0 && !isBalanced && (
            <button
              type="button"
              className="btn btn-warning btn-small"
              disabled={disabled}
              onClick={() => commit(balanceRoadmap(roadmap, target, mulai))}
            >
              Samakan durasi
            </button>
          )}
        </div>
      </div>

      {roadmap.length === 0 && (
        <p className="roadmap-empty">
          Belum ada roadmap. Klik <strong>Generate harian</strong> untuk membuat rencana per hari,
          lalu edit judul kegiatannya.
        </p>
      )}

      {roadmap.length > 0 && (
        <div className="roadmap-list">
          {roadmap.map((step, index) => (
            <div className="roadmap-row" key={step.id}>
              <div className="roadmap-row-head">
                <span className="roadmap-number">{index + 1}</span>
                <span className="roadmap-date">
                  {formatDateShort(step.mulai)} – {formatDateShort(step.selesai)}
                </span>
                <span className="roadmap-duration">{step.durasiHari} hari</span>

                <div className="roadmap-row-actions">
                  <button
                    type="button"
                    className="btn-action btn-gray"
                    title="Naikkan langkah"
                    disabled={disabled || index === 0}
                    onClick={() => moveStep(index, 'up')}
                  >
                    🔼
                  </button>
                  <button
                    type="button"
                    className="btn-action btn-gray"
                    title="Turunkan langkah"
                    disabled={disabled || index === roadmap.length - 1}
                    onClick={() => moveStep(index, 'down')}
                  >
                    🔽
                  </button>
                  <button
                    type="button"
                    className="btn-action btn-del"
                    title="Hapus langkah"
                    disabled={disabled}
                    onClick={() => removeStep(step.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="roadmap-row-fields">
                <input
                  type="text"
                  className="roadmap-title-input"
                  placeholder="Judul kegiatan"
                  value={step.judul}
                  disabled={disabled}
                  onChange={(event) => updateStep(step.id, { judul: event.target.value })}
                />

                <input
                  type="text"
                  className="roadmap-desc-input"
                  placeholder="Detail kegiatan (opsional)"
                  value={step.deskripsi}
                  disabled={disabled}
                  onChange={(event) => updateStep(step.id, { deskripsi: event.target.value })}
                />

                <input
                  type="number"
                  className="roadmap-duration-input"
                  min="1"
                  step="1"
                  title="Durasi langkah (hari)"
                  value={step.durasiHari}
                  disabled={disabled}
                  onChange={(event) =>
                    updateStep(step.id, {
                      durasiHari: Math.max(1, Math.floor(Number(event.target.value) || 1)),
                    })
                  }
                />

                <select
                  className="roadmap-status-input"
                  value={step.status}
                  disabled={disabled}
                  onChange={(event) => updateStep(step.id, { status: event.target.value })}
                >
                  {STEP_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {roadmap.length > 0 && !isBalanced && (
        <p className="roadmap-warning">
          ⚠️ Total durasi roadmap ({total} hari) belum sama dengan durasi request ({target} hari).
          Gunakan tombol <strong>Samakan durasi</strong> atau sesuaikan manual.
        </p>
      )}
    </div>
  );
}
