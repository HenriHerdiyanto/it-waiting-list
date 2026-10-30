import { useState } from 'react';
import { STATUS, TAB_DONE, TAB_PENDING } from '../constants';
import { formatDateTime } from '../utils/format';

const STATUS_CLASS = {
  [STATUS.WAITING]: 'status-waiting',
  [STATUS.ON_PROGRESS]: 'status-proses',
  [STATUS.PENDING]: 'status-pending',
  [STATUS.DONE]: 'status-done',
};

function sameGroup(a, b) {
  return Boolean(a && b) && a.is_priority === b.is_priority && a.status === b.status;
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
}) {
  const [dragState, setDragState] = useState({ id: null, overId: null });

  const start = (page - 1) * itemsPerPage;
  const pageItems = items.slice(start, start + itemsPerPage);
  const isDoneTab = tab === TAB_DONE;
  const isPendingTab = tab === TAB_PENDING;
  const columnCount = 5 + (isDoneTab ? 1 : 0) + (isLoggedIn ? 1 : 0);
  const dragEnabled = isLoggedIn && canReorder && !isDoneTab && !busy;

  const emptyMessage = isDoneTab
    ? 'Belum ada request yang selesai.'
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
      {dragEnabled && (
        <p className="drag-hint">
          💡 Seret baris untuk mengurutkan. Hanya bisa di dalam grup prioritas/status yang sama.
        </p>
      )}

      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th scope="col" className="col-no">No</th>
              <th scope="col" className="col-name">Nama (Divisi)</th>
              <th scope="col" className="col-desc">Deskripsi</th>
              <th scope="col" className="col-pic">PIC</th>
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

              const rowClass = [
                req.is_priority ? 'row-priority' : '',
                dragState.id === req.id ? 'is-dragging' : '',
                dragState.overId === req.id ? 'is-drop-target' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <tr
                  key={req.id}
                  className={rowClass}
                  draggable={dragEnabled}
                  onDragStart={(event) => {
                    if (!dragEnabled) return;
                    setDragState({ id: req.id, overId: null });
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', String(req.id));
                  }}
                  onDragEnd={() => setDragState({ id: null, overId: null })}
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
                      {req.is_priority && (
                        <span className="priority-star" title="Prioritas VIP" aria-label="Prioritas VIP">
                          ⭐
                        </span>
                      )}
                      <div>
                        <strong>{req.nama_orang_req || '-'}</strong>
                        <span title={req.divisi.join(', ')}>
                          {req.divisi.length > 0 ? req.divisi.join(', ') : 'Management'}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="cell-desc">{req.deskripsi || '-'}</td>

                  <td>{req.PIC || <span className="muted">—</span>}</td>

                  <td>
                    <span className={`badge ${STATUS_CLASS[req.status] ?? ''}`}>{req.status}</span>
                  </td>

                  {isDoneTab && <td className="cell-date">{formatDateTime(req.doneAt)}</td>}

                  {isLoggedIn && (
                    <td>
                      <div className="admin-actions">
                        {!isDoneTab && (
                          <>
                            <button
                              type="button"
                              onClick={() => onTogglePriority(req)}
                              className={`btn-action btn-block ${req.is_priority ? 'btn-outline-dark' : 'btn-gold'}`}
                              disabled={busy}
                            >
                              {req.is_priority ? '❌ Hapus Top VIP' : '⭐ Jadikan Top VIP'}
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
                            onClick={() => onEdit(req)}
                            disabled={busy}
                            className="btn-action btn-edit"
                          >
                            ✏️ Edit
                          </button>

                          {isDoneTab && (
                            <button
                              type="button"
                              onClick={() => onReopen(req)}
                              disabled={busy}
                              className="btn-action btn-reopen"
                            >
                              ↩️ Buka
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onDelete(req)}
                          disabled={busy}
                          className="btn-action btn-del btn-block"
                        >
                          🗑️ Hapus
                        </button>
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
