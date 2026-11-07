import { STATUS } from '../constants';
import { coerceDateKey, parseDateKey } from './date';
import { formatPicNames } from './pic';
import { roadmapProgress } from './roadmap';
import { getScheduleStatus } from './schedule';

const CSV_HEADERS = [
  'No',
  'Nama',
  'Divisi',
  'Deskripsi',
  'Deskripsi Revisi',
  'Link Tambahan',
  'Lampiran',
  'PIC',
  'Prioritas',
  'Alasan Prioritas',
  'Status',
  'Mulai',
  'Durasi (hari)',
  'Estimasi Selesai',
  'Realisasi Mulai',
  'Selesai Pada',
  'Progress',
  'Kesehatan Jadwal',
  'Tergeser Oleh',
  'Alasan Tergeser',
  'Urutan',
];

const shortFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
});
const longFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

/**
 * Deskripsi yang ditampilkan ke user.
 * Saat status Revisi, pakai deskripsi revisi; selain itu pakai deskripsi lama.
 */
export function getDisplayDescription(item) {
  if (!item) return '';

  const revisi = String(item.deskripsiRevisi ?? '').trim();
  if (item.status === STATUS.REVISI && revisi) return revisi;

  return String(item.deskripsi ?? '');
}

export function requestsToCsv(items, offset = 0, allRequests = []) {
  const byId = new Map(allRequests.map((item) => [String(item.id), item]));

  const rows = items.map((item, index) => {
    const progress = roadmapProgress(item.roadmap);
    const shiftedBy = item.tergeserOleh
      ? byId.get(String(item.tergeserOleh))
      : null;

    return [
      offset + index + 1,
      item.nama_orang_req,
      item.divisi.length > 0 ? item.divisi.join('; ') : 'Management',
      item.deskripsi,
      item.deskripsiRevisi,
      (item.links ?? [])
        .map((link) => [link.label, link.url].filter(Boolean).join(': '))
        .join('; '),
      (item.attachments ?? [])
        .map((attachment) => `${attachment.name} (${attachment.url})`)
        .join('; '),
      formatPicNames(item.PIC, '; '),
      item.prioritas,
      item.alasanPrioritas,
      item.status,
      item.mulai ?? '',
      item.durasiHari ?? '',
      item.estimasiSelesai ?? '',
      item.actualStart ?? '',
      item.doneAt ?? '',
      progress.total > 0 ? `${progress.completed}/${progress.total} (${progress.percent}%)` : '',
      getScheduleStatus(item),
      shiftedBy
        ? `${shiftedBy.nama_orang_req} (#${item.tergeserOleh})`
        : item.tergeserOleh ?? '',
      item.alasanTergeser ?? '',
      item.urutan ?? '',
    ];
  });

  return [CSV_HEADERS, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function downloadCsv(filename, content) {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

/** Format ukuran file menjadi teks ringkas, misalnya 1.4 MB. */
export function formatFileSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '—';

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(value) / Math.log(1024)),
  );
  const size = value / 1024 ** exponent;
  const rounded = exponent === 0 || size >= 10 ? Math.round(size) : Number(size.toFixed(1));

  return `${rounded} ${units[exponent]}`;
}

export function formatDateShort(value) {
  const key = coerceDateKey(value);
  if (!key) return '—';
  return shortFormatter.format(parseDateKey(key));
}

export function formatDate(value) {
  const key = coerceDateKey(value);
  if (!key) return '—';
  return longFormatter.format(parseDateKey(key));
}

export function formatDateRange(start, end) {
  const startKey = coerceDateKey(start);
  const endKey = coerceDateKey(end);

  if (!startKey && !endKey) return '—';
  if (!startKey) return formatDate(endKey);
  if (!endKey) return formatDate(startKey);
  if (startKey === endKey) return formatDate(startKey);

  const startYear = startKey.slice(0, 4);
  const endYear = endKey.slice(0, 4);

  return startYear === endYear
    ? `${formatDateShort(startKey)} – ${formatDate(endKey)}`
    : `${formatDate(startKey)} – ${formatDate(endKey)}`;
}

export function formatDateTime(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

