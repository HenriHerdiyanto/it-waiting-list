import { STATUS, STATUS_WEIGHT, TAB_DONE } from '../constants';

const NO_ORDER = Number.MAX_SAFE_INTEGER;

function compareIds(a, b) {
  const numA = Number(a);
  const numB = Number(b);
  if (Number.isFinite(numA) && Number.isFinite(numB)) return numA - numB;
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true });
}

/**
 * Aturan urut final:
 * 1. VIP selalu di atas
 * 2. Status: On Proses -> Waiting -> Done
 * 3. urutan manual (unik 1..N)
 * 4. createdAt lalu id sebagai tie-breaker agar selalu stabil
 */
function compareRequests(a, b) {
  if (a.is_priority !== b.is_priority) return a.is_priority ? -1 : 1;

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
  if (['on proses', 'on process', 'proses', 'in progress', 'progress'].includes(status)) {
    return STATUS.ON_PROGRESS;
  }
  return STATUS.WAITING;
}

export function normalizeRequest(item = {}, index = 0) {
  const status = normalizeStatus(item.status);
  const parsedOrder =
    item.urutan === null || item.urutan === undefined || item.urutan === ''
      ? null
      : Number(item.urutan);

  return {
    ...item,
    id: item.id ?? `local-${index}`,
    nama_orang_req: String(item.nama_orang_req ?? '').trim(),
    divisi: String(item.divisi ?? '').trim(),
    deskripsi: String(item.deskripsi ?? ''),
    PIC: String(item.PIC ?? '').trim(),
    status,
    is_priority: item.is_priority === true || item.is_priority === 'true',
    urutan: Number.isFinite(parsedOrder) ? parsedOrder : null,
    createdAt: item.createdAt ?? null,
    doneAt: status === STATUS.DONE ? (item.doneAt ?? item.createdAt ?? null) : null,
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

/**
 * Normalisasi data dari API sekaligus menyembuhkan urutan duplikat/hilang.
 * `changed` berisi item yang perlu di-PUT agar urutan tersimpan permanen.
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

    return originalOrder !== item.urutan || originalDoneAt !== (item.doneAt ?? null);
  });

  return { ordered, changed };
}

/** Reindex seluruh daftar setelah penghapusan agar tidak ada nomor bolong. */
export function reindexRequests(list) {
  const ordered = assignOrder(sortRequests(list));
  return { ordered, changed: diffOrder(list, ordered) };
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
  if (current.is_priority !== target.is_priority || current.status !== target.status) {
    return null;
  }

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
  if (source.is_priority !== target.is_priority || source.status !== target.status) {
    return null;
  }

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

/** Filter berdasarkan tab, pencarian, divisi, dan status. */
export function filterRequests(list, { tab, search = '', divisi = 'Semua', status = 'Semua' }) {
  const term = String(search ?? '').trim().toLowerCase();

  return list.filter((item) => {
    const inTab = tab === TAB_DONE ? item.status === STATUS.DONE : item.status !== STATUS.DONE;
    if (!inTab) return false;

    if (divisi !== 'Semua' && item.divisi !== divisi) return false;

    if (tab !== TAB_DONE && status !== 'Semua' && item.status !== status) return false;

    if (!term) return true;

    return [item.nama_orang_req, item.deskripsi, item.PIC, item.divisi].some((value) =>
      String(value ?? '').toLowerCase().includes(term),
    );
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

export function isFilterActive({ search = '', divisi = 'Semua', status = 'Semua' }) {
  return String(search).trim() !== '' || divisi !== 'Semua' || status !== 'Semua';
}
