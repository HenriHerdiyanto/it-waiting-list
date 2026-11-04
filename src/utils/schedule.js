import {
  MAX_HISTORY,
  PRIORITY,
  PRIORITY_WEIGHT,
  SCHEDULE_STATUS,
  SHIFT_SCOPE,
  STATUS,
} from '../constants';
import {
  coerceDateKey,
  countOverdueDays,
  rangesOverlap,
  todayKey,
} from './date';
import { normalizePicNames, picsOverlap } from './pic';

function isActive(item) {
  return item && item.status !== STATUS.DONE;
}

function hasSchedule(item) {
  return Boolean(coerceDateKey(item?.mulai) && coerceDateKey(item?.estimasiSelesai));
}

function normalizedDivisi(item) {
  return Array.isArray(item?.divisi) ? item.divisi.map((value) => String(value).toLowerCase()) : [];
}

function intersectsDivisi(a, b) {
  const left = normalizedDivisi(a);
  const right = normalizedDivisi(b);
  return left.some((value) => right.includes(value));
}

function samePic(a, b) {
  return picsOverlap(a?.PIC, b?.PIC);
}

export function getScheduleStatus(item, today = todayKey()) {
  if (!item) return SCHEDULE_STATUS.UNSCHEDULED;
  if (item.status === STATUS.DONE) return SCHEDULE_STATUS.DONE;

  const start = coerceDateKey(item.mulai);
  const end = coerceDateKey(item.estimasiSelesai);
  if (!start || !end) return SCHEDULE_STATUS.UNSCHEDULED;

  if (today < start) return SCHEDULE_STATUS.SCHEDULED;
  if (today > end) return SCHEDULE_STATUS.OVERDUE;
  return SCHEDULE_STATUS.RUNNING;
}

export function getOverdueDays(item, today = todayKey()) {
  if (getScheduleStatus(item, today) !== SCHEDULE_STATUS.OVERDUE) return 0;
  return countOverdueDays(item.estimasiSelesai, today);
}

function shiftOrder(a, b) {
  // Proyek Normal lebih dulu, Urgent terakhir agar tidak saling menimpa keterangan.
  const weightA = PRIORITY_WEIGHT[a.prioritas] ?? PRIORITY_WEIGHT.NORMAL;
  const weightB = PRIORITY_WEIGHT[b.prioritas] ?? PRIORITY_WEIGHT.NORMAL;
  if (weightA !== weightB) return weightB - weightA;

  const startA = coerceDateKey(a.mulai) ?? '';
  const startB = coerceDateKey(b.mulai) ?? '';
  if (startA !== startB) return startA < startB ? -1 : 1;

  return (Number(a.urutan) || 0) - (Number(b.urutan) || 0);
}

/**
 * Mencari request aktif yang tanggalnya bentrok dengan request prioritas.
 * Semua kandidat dikembalikan (termasuk yang dikunci) agar bisa ditampilkan di preview.
 */
export function findOverlapCandidates(requests, urgent, { scope = SHIFT_SCOPE.ALL } = {}) {
  const start = coerceDateKey(urgent?.mulai);
  const end = coerceDateKey(urgent?.estimasiSelesai);
  if (!start || !end) return [];

  return requests
    .filter((item) => {
      if (!isActive(item) || String(item.id) === String(urgent?.id)) return false;
      if (!hasSchedule(item)) return false;

      if (
        !rangesOverlap(start, end, item.mulai, item.estimasiSelesai)
      ) {
        return false;
      }

      if (scope === SHIFT_SCOPE.DIVISI) return intersectsDivisi(urgent, item);

      if (scope === SHIFT_SCOPE.PIC) {
        if (normalizePicNames(urgent?.PIC).length === 0) {
          return intersectsDivisi(urgent, item);
        }
        return samePic(urgent, item);
      }

      return true;
    })
    .sort(shiftOrder);
}

function historyEntry(entry) {
  return {
    at: new Date().toISOString(),
    ...entry,
  };
}

function appendHistory(item, entry) {
  const history = Array.isArray(item.riwayatJadwal) ? item.riwayatJadwal : [];
  return [...history, historyEntry(entry)].slice(-MAX_HISTORY);
}

/** Keterangan yang ditambahkan ke proyek yang bentrok dengan request prioritas. */
export function defaultNoteText(urgent) {
  const name = urgent?.nama_orang_req || 'request prioritas';
  return `Tergeser oleh ${name} (${urgent?.prioritas || PRIORITY.URGENT})`;
}

/**
 * Menyusun rencana penambahan keterangan tanpa mengubah tanggal proyek.
 * Hanya `tergeserOleh`, `alasanTergeser`, `jumlahTergeser`, dan riwayat yang diperbarui.
 * `selectedIds` menentukan proyek mana yang diberi keterangan.
 */
export function buildNotePlan(requests, urgent, { selectedIds = [] } = {}) {
  const start = coerceDateKey(urgent?.mulai);
  const end = coerceDateKey(urgent?.estimasiSelesai);
  if (!start || !end) return { items: [], count: 0 };

  const selected = new Set(Array.from(selectedIds, (id) => String(id)));
  const candidates = findOverlapCandidates(requests, urgent, {
    scope: urgent?.lingkupGeser || SHIFT_SCOPE.ALL,
  })
    .filter((item) => selected.has(String(item.id)) && !item.jadwalTerkunci)
    .sort(shiftOrder);

  if (candidates.length === 0) return { items: [], count: 0 };

  const note = defaultNoteText(urgent);
  const plan = candidates.map((item) => {
    const alreadyNoted =
      String(item.tergeserOleh ?? '') === String(urgent?.id ?? '') &&
      String(item.alasanTergeser ?? '') === note;

    const updated = {
      ...item,
      tergeserOleh: urgent?.id ?? null,
      alasanTergeser: note,
      jumlahTergeser: alreadyNoted
        ? Math.max(1, Number(item.jumlahTergeser) || 1)
        : (Number(item.jumlahTergeser) || 0) + 1,
      riwayatJadwal: alreadyNoted
        ? item.riwayatJadwal ?? []
        : appendHistory(item, {
            tipe: 'keterangan',
            olehId: urgent?.id ?? null,
            dari: null,
            ke: null,
            alasan: note,
          }),
      updatedAt: new Date().toISOString(),
    };

    return {
      id: item.id,
      request: item,
      updated,
      note,
    };
  });

  return { items: plan, count: plan.length };
}

