import { useRef, useState } from 'react';
import { PRIORITY, STATUS, TAB_DONE, TAB_PENDING, TAB_REVISI } from '../constants';
import { formatDateRange, formatDateTime, getDisplayDescription } from '../utils/format';
import { roadmapProgress } from '../utils/roadmap';
import ScheduleBadge, { PriorityBadge } from './ScheduleBadge';

const STATUS_CLASS = {
  [STATUS.WAITING]: 'status-waiting',
  [STATUS.ON_PROGRESS]: 'status-proses',
  [STATUS.REVISI]: 'status-revisi',
  [STATUS.PENDING]: 'status-pending',
  [STATUS.DONE]: 'status-done',
};

function sameGroup(a, b) {
  return Boolean(a && b) && a.prioritas === b.prioritas && a.status === b.status;
}

export default function RequestTable({
  items,
  page,
  itemsPerPage,
  isLoggedIn,
  tab,
  canReorder,
  busy,
  onMove,
  onMoveTo,
  onTogglePriority,
  onEdit,
  onDelete,
  onReopen,
  onRevise,
  onDetail,
}) {
  const [dragState, setDragState] = useState({ id: null, overId: null });
  const ignoreClickRef = useRef(false);

  const start = (page - 1) * itemsPerPage;
  const pageItems = items.slice(start, start + itemsPerPage);
  const isDoneTab = tab === TAB_DONE;
  const isRevisiTab = tab === TAB_REVISI;
  const isPendingTab = tab === TAB_PENDING;
  const columnCount = 6 + (isDoneTab ? 1 : 0) + (isLoggedIn ? 1 : 0);
  const dragEnabled = isLoggedIn && canReorder && !isDoneTab && !busy;

  const emptyMessage = isDoneTab
    ? 'Belum ada request yang selesai.'
    : isRevisiTab
      ? 'Belum ada request yang perlu revisi.'
      : isPendingTab
        ? 'Belum ada request yang pending.'
        : 'Tidak ada request yang cocok dengan filter.';

  const reorderHint = canReorder
    ? 'Sudah di batas grup prioritas/status yang sama'
    : 'Reset pencarian/filter untuk mengubah urutan';

  const handleDragOver = (event, target) => {
    if (!dragEnabled || !dragState.id) return;
    if (String(dragState.id) === String(target.id)) return;

    const source = items.find((item) => String(item.id) === String(dragState.id));
    if (!sameGroup(source, target)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    if (dragState.overId !== target.id) {
      setDragState((previous) => ({ ...previous, overId: target.id }));
    }
  };

  const handleDrop = (event, target) => {
    event.preventDefault();
    const sourceId = dragState.id ?? event.dataTransfer.getData('text/plain');

    if (sourceId && String(sourceId) !== String(target.id)) {
      onMoveTo(sourceId, target.id);
    }

    setDragState({ id: null, overId: null });
  };

  const handleDragLeave = (event, target) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setDragState((previous) =>
      previous.overId === target.id ? { ...previous, overId: null } : previous,
    );
  };

  return (
    <>
      <p className="drag-hint">
        💡 Klik baris untuk melihat detail jadwal dan agenda per tanggal.
        {dragEnabled &&
          ' Seret baris untuk mengurutkan (hanya dalam grup prioritas/status yang sama).'}
      </p>

      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th scope="col" className="col-no">No</th>
              <th scope="col" className="col-name">Nama (Divisi)</th>
              <th scope="col" className="col-desc">Deskripsi</th>
              <th scope="col" className="col-pic">PIC</th>
              <th scope="col" className="col-schedule">Jadwal</th>
              <th scope="col" className="col-status">Status</th>
              {isDoneTab && <th scope="col" className="col-date">Selesai</th>}
              {isLoggedIn && <th scope="col" className="col-actions">Aksi Admin</th>}
            </tr>
          </thead>

          <tbody>
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="empty-cell">
                  {emptyMessage}
                </td>
              </tr>
            )}

            {pageItems.map((req, index) => {
              const globalIndex = start + index;
              const previous = items[globalIndex - 1];
              const next = items[globalIndex + 1];
              const canMoveUp = canReorder && sameGroup(previous, req);
              const canMoveDown = canReorder && sameGroup(next, req);
              const progress = roadmapProgress(req.roadmap);

              const rowClass = [
                req.prioritas === PRIORITY.URGENT
                  ? 'row-priority'
                  : req.prioritas === PRIORITY.HIGH
                    ? 'row-high'
                    : '',
                'row-clickable',
                dragState.id === req.id ? 'is-dragging' : '',
                dragState.overId === req.id ? 'is-drop-target' : '',
              ]
                .filter(Boolean)
                .join(' ');

              const handleRowOpen = () => {
                if (ignoreClickRef.current) {
                  ignoreClickRef.current = false;
                  return;
                }

                onDetail?.(req);
              };

              return (
                <tr
                  key={req.id}
                  className={rowClass}
                  tabIndex={0}
                  onClick={handleRowOpen}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key !== 'Enter' && event.key !== ' ') return;

                    event.preventDefault();
                    handleRowOpen();
                  }}
                  draggable={dragEnabled}
                  onDragStart={(event) => {
                    if (!dragEnabled) return;
                    ignoreClickRef.current = true;
                    setDragState({ id: req.id, overId: null });
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', String(req.id));
                  }}
                  onDragEnd={() => {
                    setDragState({ id: null, overId: null });
                    window.setTimeout(() => {
                      ignoreClickRef.current = false;
                    }, 0);
                  }}
                  onDragOver={(event) => handleDragOver(event, req)}
                  onDragLeave={(event) => handleDragLeave(event, req)}
                  onDrop={(event) => handleDrop(event, req)}
                >
                  <td className="cell-index">
                    <span className="row-number">{globalIndex + 1}</span>
                    {dragEnabled && (
                      <span className="drag-handle" title="Tarik untuk mengurutkan" aria-hidden="true">
                        ⠿
                      </span>
                    )}
                  </td>

                  <td>
                    <div className="requester">
                      <div>
                        <strong>{req.nama_orang_req || '-'}</strong>
                        <span className="requester-divisi" title={req.divisi.join(', ')}>
                          {req.divisi.length > 0 ? req.divisi.join(', ') : 'Management'}
                        </span>
                        <PriorityBadge value={req.prioritas} />
                      </div>
                    </div>
                  </td>

                  <td className="cell-desc">{getDisplayDescription(req) || '-'}</td>

                  <td>{req.PIC || <span className="muted">—</span>}</td>

                  <td className="cell-schedule">
                    <div className="schedule-cell">
                      {req.mulai && req.estimasiSelesai ? (
                        <strong className="schedule-range">
                          {formatDateRange(req.mulai, req.estimasiSelesai)}
                        </strong>
                      ) : (
                        <span className="muted">Belum dijadwalkan</span>
                      )}

                      <span className="schedule-meta">{req.durasiHari} hari</span>

                      <ScheduleBadge item={req} />

                      {progress.total > 0 && (
                        <div
                          className="mini-progress"
                          title={`Roadmap ${progress.completed}/${progress.total} langkah (${progress.percent}%)`}
                        >
                          <div
                            className="mini-progress-fill"
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                      )}

                      {req.jumlahTergeser > 0 && req.alasanTergeser && (
                        <span className="shift-note" title={req.alasanTergeser}>
                          {req.alasanTergeser}
                        </span>
                      )}
                    </div>
                  </td>

                  <td>
                    <span className={`badge ${STATUS_CLASS[req.status] ?? ''}`}>{req.status}</span>
                  </td>

                  {isDoneTab && <td className="cell-date">{formatDateTime(req.doneAt)}</td>}

                  {isLoggedIn && (
                    <td onClick={(event) => event.stopPropagation()}>
                      <div className="admin-actions">
                        {!isDoneTab && (
                          <>
                            <button
                              type="button"
                              onClick={() => onTogglePriority(req)}
                              className={`btn-action btn-block ${
                                req.prioritas === PRIORITY.URGENT
                                  ? 'btn-outline-dark'
                                  : 'btn-gold'
                              }`}
                              disabled={busy}
                            >
                              {req.prioritas === PRIORITY.URGENT
                                ? '❌ Hapus Urgent'
                                : '⭐ Jadikan Urgent'}
                            </button>

                            <div className="action-row">
                              <button
                                type="button"
                                onClick={() => onMove(req.id, 'up')}
                                disabled={!canMoveUp || busy}
                                title={canMoveUp ? 'Naikkan satu posisi' : reorderHint}
                                className="btn-action btn-gray"
                              >
                                🔼 Naik
                              </button>
                              <button
                                type="button"
                                onClick={() => onMove(req.id, 'down')}
                                disabled={!canMoveDown || busy}
                                title={canMoveDown ? 'Turunkan satu posisi' : reorderHint}
                                className="btn-action btn-gray"
                              >
                                🔽 Turun
                              </button>
                            </div>
                          </>
                        )}

                        <div className="action-row">
                          <button
                            type="button"
                            onClick={() => onDetail(req)}
                            disabled={busy}
                            className="btn-action btn-detail"
                          >
                            📋 Detail
                          </button>

                          <button
                            type="button"
                            onClick={() => onEdit(req)}
                            disabled={busy}
                            className="btn-action btn-edit"
                          >
                            ✏️ Edit
                          </button>
                        </div>

                        <div className="action-row">
                          {isDoneTab && (
                            <>
                              <button
                                type="button"
                                onClick={() => onReopen(req)}
                                disabled={busy}
                                className="btn-action btn-reopen"
                              >
                                ↩️ Buka
                              </button>
                              <button
                                type="button"
                                onClick={() => onRevise(req)}
                                disabled={busy}
                                className="btn-action btn-revisi"
                              >
                                🔁 Revisi
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => onDelete(req)}
                            disabled={busy}
                            className="btn-action btn-del"
                          >
                            🗑️ Hapus
                          </button>
                        </div>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
