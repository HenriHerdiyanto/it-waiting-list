import { useEffect } from 'react';
import { STATUS } from '../constants';
import {
  formatDate,
  formatDateRange,
  formatDateTime,
  formatFileSize,
  getDisplayDescription,
} from '../utils/format';
import {
  attachmentKindLabel,
  getAttachmentViewUrl,
  isImageAttachment,
  isSafeAttachmentUrl,
} from '../utils/attachments';
import { formatLinkLabel, isValidLinkUrl } from '../utils/links';
import { formatPicNames } from '../utils/pic';
import { getOverdueDays, getScheduleStatus } from '../utils/schedule';
import { roadmapProgress } from '../utils/roadmap';
import { PriorityBadge } from './ScheduleBadge';

const HISTORY_LABEL = {
  keterangan: 'Keterangan bentrok',
  digeser: 'Digeser',
  dipulihkan: 'Dipulihkan',
  manual: 'Perubahan manual',
};

const STEP_STATUS_LABEL = {
  todo: 'Belum',
  progress: 'On Progress',
  done: 'Selesai',
  skipped: 'Dilewati',
};

function HistoryDates({ entry }) {
  if (!entry.dari && !entry.ke) return null;

  return (
    <span className="history-dates">
      {entry.dari ? formatDateRange(entry.dari.mulai, entry.dari.estimasiSelesai) : '—'}
      <span className="shift-arrow">→</span>
      {entry.ke ? formatDateRange(entry.ke.mulai, entry.ke.estimasiSelesai) : '—'}
    </span>
  );
}

export default function RequestDetail({ request, busy, isLoggedIn, onClose, onToggleStep }) {
  useEffect(() => {
    if (!request) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [request, onClose]);

  if (!request) return null;

  const progress = roadmapProgress(request.roadmap);
  const scheduleStatus = getScheduleStatus(request);
  const overdueDays = getOverdueDays(request);
  const isRevisi = request.status === STATUS.REVISI;
  const displayDescription = getDisplayDescription(request);
  const picLabel = formatPicNames(request.PIC);
  const links = Array.isArray(request.links) ? request.links : [];
  const attachments = Array.isArray(request.attachments) ? request.attachments : [];
  const hasDifferentOriginal =
    isRevisi && String(request.deskripsi ?? '').trim() !== displayDescription.trim();

  return (
    <div className="modal-backdrop drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="detail-header">
          <div>
            <p className="eyebrow">Detail Request</p>
            <h3 id="detail-title">{request.nama_orang_req || '(tanpa nama)'}</h3>
            <p className="hint">
              {request.divisi.length > 0 ? request.divisi.join(', ') : 'Management'}
              {picLabel ? ` · PIC ${picLabel}` : ''}
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            ×
          </button>
        </div>

        <div className="detail-badges">
          <PriorityBadge value={request.prioritas} />
          <span className="badge">{request.status}</span>
          <span className="schedule-badge">{scheduleStatus}</span>
          {overdueDays > 0 && (
            <span className="schedule-badge schedule-overdue">Terlambat {overdueDays} hari</span>
          )}
          {request.jumlahTergeser > 0 && (
            <span
              className="schedule-badge schedule-shifted"
              title={request.alasanTergeser || 'Jadwal pernah ditandai tergeser'}
            >
              Tergeser
            </span>
          )}
          {request.jadwalTerkunci && (
            <span className="schedule-badge schedule-locked">🔒 Terkunci</span>
          )}
        </div>

        <section className="detail-section">
          <h4>{isRevisi ? 'Deskripsi Revisi' : 'Deskripsi Pekerjaan'}</h4>
          <p className="detail-text">{displayDescription || '—'}</p>
          {hasDifferentOriginal && (
            <details className="detail-original">
              <summary>Deskripsi awal (sebelum revisi)</summary>
              <p className="detail-text">{request.deskripsi}</p>
            </details>
          )}
        </section>

        {links.length > 0 && (
          <section className="detail-section">
            <h4>Link Tambahan</h4>
            <ul className="detail-links">
              {links.map((link) => (
                <li key={link.id}>
                  {isValidLinkUrl(link.url) ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={link.url}
                    >
                      {formatLinkLabel(link)} <span aria-hidden="true">↗</span>
                    </a>
                  ) : (
                    <span className="detail-link-invalid">{formatLinkLabel(link)}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {attachments.length > 0 && (
          <section className="detail-section">
            <h4>Lampiran</h4>
            <div className="detail-attachments">
              {attachments.map((attachment) => {
                const safeUrl = isSafeAttachmentUrl(attachment.url)
                  ? attachment.url
                  : '';
                const viewUrl = getAttachmentViewUrl(attachment);
                const isImage = isImageAttachment(attachment);
                const meta = `${formatFileSize(attachment.size)} · ${attachmentKindLabel(
                  attachment,
                )}`;

                const content = (
                  <>
                    {isImage && safeUrl ? (
                      <img
                        className="detail-attachment-image-preview"
                        src={safeUrl}
                        alt={attachment.name}
                        loading="lazy"
                      />
                    ) : (
                      <span className="attachment-icon" aria-hidden="true">
                        📄
                      </span>
                    )}
                    <span className="detail-attachment-body">
                      <strong className="detail-attachment-name">{attachment.name}</strong>
                      <small className="detail-attachment-meta">{meta}</small>
                    </span>
                  </>
                );

                if (!safeUrl) {
                  return (
                    <div className="detail-attachment detail-attachment-file" key={attachment.id}>
                      {content}
                    </div>
                  );
                }

                return (
                  <a
                    className={`detail-attachment ${
                      isImage ? 'detail-attachment-image' : 'detail-attachment-file'
                    }`}
                    href={viewUrl || safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={attachment.id}
                    title={`Buka ${attachment.name}`}
                  >
                    {content}
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {request.alasanPrioritas && (
          <section className="detail-section">
            <h4>Alasan Prioritas</h4>
            <p className="detail-text">{request.alasanPrioritas}</p>
          </section>
        )}

        <section className="detail-section">
          <h4>Timeline</h4>
          <dl className="detail-grid">
            <dt>Mulai</dt>
            <dd>{formatDate(request.mulai)}</dd>
            <dt>Estimasi Selesai</dt>
            <dd>{formatDate(request.estimasiSelesai)}</dd>
            <dt>Durasi</dt>
            <dd>{request.durasiHari} hari</dd>
            <dt>Realisasi Mulai</dt>
            <dd>{formatDateTime(request.actualStart)}</dd>
            <dt>{request.status === STATUS.REVISI ? 'Selesai (sebelum revisi)' : 'Selesai'}</dt>
            <dd>{formatDateTime(request.doneAt)}</dd>
          </dl>

          {request.jadwalAsli &&
            (request.jadwalAsli.mulai !== request.mulai ||
              request.jadwalAsli.estimasiSelesai !== request.estimasiSelesai) && (
              <p className="detail-note">
                Jadwal asli sebelum tergeser:{' '}
                <strong>
                  {formatDateRange(request.jadwalAsli.mulai, request.jadwalAsli.estimasiSelesai)}
                </strong>
              </p>
            )}

          {request.alasanTergeser && (
            <p className="detail-note">
              Keterangan jadwal: <strong>{request.alasanTergeser}</strong>
            </p>
          )}
        </section>

        <section className="detail-section">
          <div className="detail-section-head">
            <h4>Agenda per Tanggal</h4>
            <span className="hint">
              {progress.total > 0
                ? `${progress.completed} dari ${progress.total} task Done · ${progress.percent}%`
                : 'Belum ada agenda'}
            </span>
          </div>

          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
          </div>

          {request.roadmap.length === 0 ? (
            <p className="hint">
              Belum ada rincian kegiatan per tanggal.
              {isLoggedIn ? ' Tambahkan roadmap lewat tombol Edit.' : ''}
            </p>
          ) : (
            <ol className="detail-roadmap">
              {request.roadmap.map((step, index) => (
                <li key={step.id} className={`detail-roadmap-item status-${step.status}`}>
                  {isLoggedIn ? (
                    <label className="detail-roadmap-check">
                      <input
                        type="checkbox"
                        checked={step.status === 'done'}
                        disabled={busy}
                        onChange={() => onToggleStep(request, step)}
                      />
                      <span className="roadmap-number">{index + 1}</span>
                    </label>
                  ) : (
                    <span className="detail-step-marker" aria-hidden="true">
                      {index + 1}
                    </span>
                  )}

                  <div className="detail-step-body">
                    <div className="detail-step-head">
                      <strong>{step.judul || `Langkah ${index + 1}`}</strong>
                      <span className={`step-status step-status-${step.status}`}>
                        {STEP_STATUS_LABEL[step.status] ?? 'Belum'}
                      </span>
                    </div>
                    {step.deskripsi && <p className="detail-step-desc">{step.deskripsi}</p>}
                    <span className="detail-step-date">
                      📅 {formatDateRange(step.mulai, step.selesai)} · {step.durasiHari} hari
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="detail-section">
          <h4>Riwayat Jadwal</h4>
          {request.riwayatJadwal.length === 0 ? (
            <p className="hint">Belum ada perubahan jadwal.</p>
          ) : (
            <ul className="history-list">
              {[...request.riwayatJadwal].reverse().map((entry, index) => (
                <li key={`${entry.at ?? 'history'}-${index}`}>
                  <div className="history-head">
                    <strong>{HISTORY_LABEL[entry.tipe] ?? entry.tipe}</strong>
                    <span className="hint">{formatDateTime(entry.at)}</span>
                  </div>
                  <HistoryDates entry={entry} />
                  {entry.alasan && <p className="detail-step-desc">{entry.alasan}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
