import {
  MAX_HISTORY,
  PRIORITY,
  PRIORITY_WEIGHT,
  SCHEDULE_STATUS,
  SHIFT_POLICY,
  SHIFT_SCOPE,
  SHIFTED_FILTER,
  STATUS,
  STATUS_WEIGHT,
  TAB_ACTIVE,
  TAB_DONE,
  TAB_PENDING,
  TAB_REVISI,
} from '../constants';
import {
  calculateEndDate,
  coerceDateKey,
  daysBetween,
  normalizeStart,
} from './date';
import { normalizeAttachments } from './attachments';
import { normalizeLinks } from './links';
import { normalizeRoadmap } from './roadmap';
import {
  isCanonicalPicArray,
  normalizePicNames,
} from './pic';
import { getScheduleStatus } from './schedule';

const NO_ORDER = Number.MAX_SAFE_INTEGER;

function compareIds(a, b) {
  const numA = Number(a);
  const numB = Number(b);
  if (Number.isFinite(numA) && Number.isFinite(numB)) return numA - numB;
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true });
}

/**
 * Aturan urut final:
 * 1. Level prioritas: Urgent -> Tinggi -> Normal
 * 2. Status: On Proses -> Waiting -> Revisi -> Pending -> Done
 * 3. urutan manual (unik 1..N)
 * 4. createdAt lalu id sebagai tie-breaker agar selalu stabil
 */
function compareRequests(a, b) {
  const priorityA = PRIORITY_WEIGHT[a.prioritas] ?? PRIORITY_WEIGHT.NORMAL;
  const priorityB = PRIORITY_WEIGHT[b.prioritas] ?? PRIORITY_WEIGHT.NORMAL;
  if (priorityA !== priorityB) return priorityA - priorityB;

  const weightA = STATUS_WEIGHT[a.status] ?? 99;
  const weightB = STATUS_WEIGHT[b.status] ?? 99;
  if (weightA !== weightB) return weightA - weightB;

  const orderA = a.urutan ?? NO_ORDER;
  const orderB = b.urutan ?? NO_ORDER;
  if (orderA !== orderB) return orderA - orderB;

  const createdA = a.createdAt ?? '';
  const createdB = b.createdAt ?? '';
  if (createdA !== createdB) return createdA < createdB ? -1 : 1;

  return compareIds(a.id, b.id);
}

export function sortRequests(list) {
  return [...list].sort(compareRequests);
}

export function normalizeStatus(value) {
  const status = String(value ?? '').trim().toLowerCase();
  if (['done', 'selesai', 'complete', 'completed'].includes(status)) return STATUS.DONE;
  if (['revisi', 'revision', 'perbaikan', 'revisi ulang'].includes(status)) {
    return STATUS.REVISI;
  }
  if (['pending', 'tertunda', 'ditunda'].includes(status)) return STATUS.PENDING;
  if (['on proses', 'on process', 'proses', 'in progress', 'progress'].includes(status)) {
    return STATUS.ON_PROGRESS;
  }
  return STATUS.WAITING;
}

export function normalizePriority(item = {}) {
  const value = String(item.prioritas ?? '').trim().toLowerCase();

  if (['urgent', 'vip', 'kritis', 'critical'].includes(value)) return PRIORITY.URGENT;
  if (['tinggi', 'high', 'prioritas'].includes(value)) return PRIORITY.HIGH;
  if (['normal', 'biasa', 'low', 'rendah'].includes(value)) return PRIORITY.NORMAL;

  return item.is_priority === true || item.is_priority === 'true'
    ? PRIORITY.URGENT
    : PRIORITY.NORMAL;
}

function normalizeDuration(value, fallback = 1) {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) return fallback;
  return Math.max(1, Math.floor(number));
}

/**
 * Menyeragamkan divisi menjadi array bersih tanpa duplikat.
 * Mendukung data lama berupa string tunggal maupun "Aoshi, FMI".
 */
export function normalizeDivisi(value) {
  const parts = Array.isArray(value) ? value : String(value ?? '').split(/[,;]/);
  const cleaned = parts.map((item) => String(item ?? '').trim()).filter(Boolean);
  return [...new Set(cleaned)];
}

function sameDivisi(a, b) {
  if (!Array.isArray(a) || a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function normalizeHistory(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry) => entry && typeof entry === 'object')
    .slice(-MAX_HISTORY)
    .map((entry) => ({
      at: entry.at ?? null,
      tipe: String(entry.tipe ?? 'manual'),
      olehId: entry.olehId ?? null,
      dari: entry.dari ?? null,
      ke: entry.ke ?? null,
      alasan: String(entry.alasan ?? ''),
    }));
}

function normalizeJadwalAsli(value, duration) {
  if (!value || typeof value !== 'object') return null;

  const mulai = coerceDateKey(value.mulai);
  if (!mulai) return null;

  return {
    mulai,
    estimasiSelesai:
      coerceDateKey(value.estimasiSelesai) ?? calculateEndDate(mulai, duration),
  };
}

export function normalizeRequest(item = {}, index = 0) {
  const status = normalizeStatus(item.status);
  const prioritas = normalizePriority(item);
  const parsedOrder =
    item.urutan === null || item.urutan === undefined || item.urutan === ''
      ? null
      : Number(item.urutan);

  const rawStart = coerceDateKey(item.mulai);
  const rawEnd = coerceDateKey(item.estimasiSelesai);
  let durasiHari = normalizeDuration(item.durasiHari, null);

  if (!durasiHari && rawStart && rawEnd) {
    durasiHari = Math.max(1, daysBetween(rawStart, rawEnd));
  }

  durasiHari = durasiHari || 1;

  const mulai = normalizeStart(rawStart);
  const estimasiSelesai = mulai ? calculateEndDate(mulai, durasiHari) : null;
  const tergeserOleh =
    item.tergeserOleh === null || item.tergeserOleh === undefined || item.tergeserOleh === ''
      ? null
      : item.tergeserOleh;

  return {
    ...item,
    id: item.id ?? `local-${index}`,
    nama_orang_req: String(item.nama_orang_req ?? '').trim(),
    divisi: normalizeDivisi(item.divisi),
    deskripsi: String(item.deskripsi ?? ''),
    deskripsiRevisi: String(item.deskripsiRevisi ?? ''),
    PIC: normalizePicNames(item.PIC),
    status,
    prioritas,
    is_priority: prioritas !== PRIORITY.NORMAL,
    alasanPrioritas: String(item.alasanPrioritas ?? '').trim(),
    kebijakanGeser:
      item.kebijakanGeser === SHIFT_POLICY.PARALLEL
        ? SHIFT_POLICY.PARALLEL
        : SHIFT_POLICY.SHIFT,
    lingkupGeser: [SHIFT_SCOPE.ALL, SHIFT_SCOPE.DIVISI, SHIFT_SCOPE.PIC].includes(
      item.lingkupGeser,
    )
      ? item.lingkupGeser
      : SHIFT_SCOPE.ALL,
    jadwalTerkunci: item.jadwalTerkunci === true || item.jadwalTerkunci === 'true',
    mulai,
    durasiHari,
    estimasiSelesai,
    links: normalizeLinks(item.links),
    attachments: normalizeAttachments(item.attachments),
    actualStart: item.actualStart ?? null,
    tergeserOleh,
    alasanTergeser: item.alasanTergeser ? String(item.alasanTergeser) : null,
    jadwalAsli: normalizeJadwalAsli(item.jadwalAsli, durasiHari),
    jumlahTergeser: Number.isFinite(Number(item.jumlahTergeser))
      ? Math.max(0, Math.floor(Number(item.jumlahTergeser)))
      : 0,
    riwayatJadwal: normalizeHistory(item.riwayatJadwal),
    roadmap: normalizeRoadmap(item.roadmap, mulai),
    urutan: Number.isFinite(parsedOrder) ? parsedOrder : null,
    createdAt: item.createdAt ?? null,
    updatedAt: item.updatedAt ?? null,
    doneAt:
      status === STATUS.DONE
        ? (item.doneAt ?? item.createdAt ?? null)
        : status === STATUS.REVISI
          ? (item.doneAt ?? null)
          : null,
  };
}

/** Memberi nomor urut 1..N sesuai urutan array yang diberikan. */
export function assignOrder(list) {
  return list.map((item, index) => ({ ...item, urutan: index + 1 }));
}

/** Mengembalikan item yang nilai urutan/doneAt-nya berbeda dari versi sebelumnya. */
export function diffOrder(previous, next) {
  const previousOrder = new Map(
    previous.map((item) => [String(item.id), item.urutan ?? null]),
  );

  return next.filter((item) => previousOrder.get(String(item.id)) !== item.urutan);
}

function jsonDiff(a, b) {
  return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
}

function hasMigrationChanges(original, item) {
  if (!original) return true;

  if (
    original.prioritas !== item.prioritas ||
    original.is_priority !== item.is_priority ||
    String(original.alasanPrioritas ?? '') !== item.alasanPrioritas ||
    original.kebijakanGeser !== item.kebijakanGeser ||
    original.lingkupGeser !== item.lingkupGeser ||
    Boolean(original.jadwalTerkunci) !== item.jadwalTerkunci ||
    coerceDateKey(original.mulai) !== item.mulai ||
    Number(original.durasiHari || 1) !== item.durasiHari ||
    coerceDateKey(original.estimasiSelesai) !== item.estimasiSelesai ||
    String(original.tergeserOleh ?? '') !== String(item.tergeserOleh ?? '') ||
    String(original.alasanTergeser ?? '') !== String(item.alasanTergeser ?? '') ||
    Number(original.jumlahTergeser || 0) !== item.jumlahTergeser ||
    !isCanonicalPicArray(original.PIC)
  ) {
    return true;
  }

  if (
    !Array.isArray(original.divisi) ||
    !sameDivisi(normalizeDivisi(original.divisi), item.divisi)
  ) {
    return true;
  }

  return (
    jsonDiff(original.roadmap, item.roadmap) ||
    jsonDiff(original.links, item.links) ||
    jsonDiff(original.attachments, item.attachments) ||
    jsonDiff(original.jadwalAsli, item.jadwalAsli) ||
    jsonDiff(original.riwayatJadwal, item.riwayatJadwal)
  );
}

/**
 * Normalisasi data dari API sekaligus menyembuhkan urutan duplikat/hilang.
 * `changed` berisi item yang perlu di-PUT agar urutan tersimpan permanen,
 * termasuk migrasi satu kali divisi lama (string) menjadi array dan field jadwal baru.
 */
export function prepareRequests(raw) {
  const normalized = raw.map((item, index) => normalizeRequest(item, index));
  const ordered = assignOrder(sortRequests(normalized));
  const rawById = new Map(raw.map((item) => [String(item.id), item]));

  const changed = ordered.filter((item) => {
    const original = rawById.get(String(item.id));
    if (!original) return true;

    const originalOrder =
      original.urutan === null || original.urutan === undefined || original.urutan === ''
        ? null
        : Number(original.urutan);
    const originalDoneAt = original.doneAt ?? null;

    return (
      originalOrder !== item.urutan ||
      originalDoneAt !== (item.doneAt ?? null) ||
      hasMigrationChanges(original, item)
    );
  });

  return { ordered, changed };
}

/** Reindex seluruh daftar setelah penghapusan agar tidak ada nomor bolong. */
export function reindexRequests(list) {
  const ordered = assignOrder(sortRequests(list));
  return { ordered, changed: diffOrder(list, ordered) };
}

function sameGroup(a, b) {
  return Boolean(a && b) && a.prioritas === b.prioritas && a.status === b.status;
}

/**
 * Menghitung hasil pemindahan satu langkah (naik/turun).
 * Hanya boleh memindah di dalam grup prioritas + status yang sama.
 */
export function buildMove(list, id, direction) {
  const sorted = sortRequests(list);
  const index = sorted.findIndex((item) => String(item.id) === String(id));
  if (index === -1) return null;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= sorted.length) return null;

  const current = sorted[index];
  const target = sorted[targetIndex];
  if (!sameGroup(current, target)) return null;

  const swapped = [...sorted];
  swapped[index] = target;
  swapped[targetIndex] = current;

  const ordered = assignOrder(swapped);
  return {
    ordered,
    changed: diffOrder(sorted, ordered),
    movedId: current.id,
  };
}

/**
 * Memindahkan `sourceId` ke posisi `targetId` (drag & drop).
 * Tetap dibatasi pada grup prioritas + status yang sama.
 */
export function buildMoveTo(list, sourceId, targetId) {
  const sorted = sortRequests(list);
  const fromIndex = sorted.findIndex((item) => String(item.id) === String(sourceId));
  const toIndex = sorted.findIndex((item) => String(item.id) === String(targetId));
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return null;

  const source = sorted[fromIndex];
  const target = sorted[toIndex];
  if (!sameGroup(source, target)) return null;

  const reordered = [...sorted];
  reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, source);

  const ordered = assignOrder(reordered);
  return {
    ordered,
    changed: diffOrder(sorted, ordered),
    movedId: source.id,
  };
}

/** Status yang ditampilkan pada masing-masing tab. */
function belongsToTab(item, tab) {
  if (tab === TAB_DONE) return item.status === STATUS.DONE;
  if (tab === TAB_REVISI) return item.status === STATUS.REVISI;
  if (tab === TAB_PENDING) return item.status === STATUS.PENDING;
  return item.status === STATUS.ON_PROGRESS || item.status === STATUS.WAITING;
}

/** Filter berdasarkan tab, pencarian, divisi, status, prioritas, dan jadwal. */
export function filterRequests(
  list,
  {
    tab,
    search = '',
    divisi = 'Semua',
    status = 'Semua',
    prioritas = 'Semua',
    health = 'Semua',
    dateFrom = '',
    dateTo = '',
    shiftedOnly = false,
  },
) {
  const term = String(search ?? '').trim().toLowerCase();
  const from = coerceDateKey(dateFrom);
  const to = coerceDateKey(dateTo);

  return list.filter((item) => {
    if (!belongsToTab(item, tab)) return false;

    if (divisi !== 'Semua' && !item.divisi.includes(divisi)) return false;
    if (prioritas !== 'Semua' && item.prioritas !== prioritas) return false;
    if (tab === TAB_ACTIVE && status !== 'Semua' && item.status !== status) return false;
    if (shiftedOnly && item.jumlahTergeser === 0) return false;

    if (health !== 'Semua') {
      if (health === SHIFTED_FILTER) {
        if (item.jumlahTergeser === 0) return false;
      } else if (getScheduleStatus(item) !== health) {
        return false;
      }
    }

    if (from || to) {
      const start = coerceDateKey(item.mulai);
      const end = coerceDateKey(item.estimasiSelesai);
      if (!start || !end) return false;
      if (from && end < from) return false;
      if (to && start > to) return false;
    }

    if (!term) return true;

    const searchable = [
      item.nama_orang_req,
      item.deskripsi,
      item.deskripsiRevisi,
      ...normalizePicNames(item.PIC),
      item.alasanPrioritas,
      item.alasanTergeser,
      item.status,
      item.prioritas,
      ...item.divisi,
      ...item.links.flatMap((link) => [link.label, link.url]),
      ...item.attachments.flatMap((attachment) => [
        attachment.name,
        attachment.type,
        attachment.url,
      ]),
      ...(Array.isArray(item.roadmap)
        ? item.roadmap.flatMap((step) => [step.judul, step.deskripsi])
        : []),
    ];

    return searchable.some((value) => String(value ?? '').toLowerCase().includes(term));
  });
}

/** Daftar yang siap ditampilkan. Tab Selesai diurutkan dari yang terbaru selesai. */
export function getVisibleRequests(list, options) {
  const filtered = filterRequests(list, options);

  if (options.tab === TAB_DONE) {
    return [...filtered].sort((a, b) => {
      const doneA = a.doneAt ?? '';
      const doneB = b.doneAt ?? '';
      if (doneA !== doneB) return doneA < doneB ? 1 : -1;
      return compareIds(b.id, a.id);
    });
  }

  return filtered;
}

export function isFilterActive({
  search = '',
  divisi = 'Semua',
  status = 'Semua',
  prioritas = 'Semua',
  health = 'Semua',
  dateFrom = '',
  dateTo = '',
  shiftedOnly = false,
}) {
  return (
    String(search).trim() !== '' ||
    divisi !== 'Semua' ||
    status !== 'Semua' ||
    prioritas !== 'Semua' ||
    health !== 'Semua' ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    Boolean(shiftedOnly)
  );
}

export { SCHEDULE_STATUS };

