import {
  MAX_HISTORY,
  PRIORITY,
  PRIORITY_WEIGHT,
  SCHEDULE_STATUS,
  SHIFT_SCOPE,
  STATUS,
} from '../constants';
import {
  addDays,
  calculateEndDate,
  coerceDateKey,
  countOverdueDays,
  diffDays,
  normalizeStart,
  rangesOverlap,
  todayKey,
} from './date';
import { syncRoadmapDates } from './roadmap';

function isActive(item) {
  return item && item.status !== STATUS.DONE;
}

function durationOf(item) {
  const number = Number(item?.durasiHari);
  if (!Number.isFinite(number) || number < 1) return 1;
  return Math.max(1, Math.floor(number));
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
  const left = String(a?.PIC ?? '').trim().toLowerCase();
  const right = String(b?.PIC ?? '').trim().toLowerCase();
  return left !== '' && left === right;
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
  // Proyek Normal digeser lebih dulu, Urgent terakhir agar tidak saling menabrak.
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
        if (String(urgent?.PIC ?? '').trim() === '') {
          return intersectsDivisi(urgent, item);
        }
        return samePic(urgent, item);
      }

      return true;
    })
    .sort(shiftOrder);
}

function findNextFreeStart(startKey, duration, blockers) {
  let cursor = normalizeStart(startKey);
  if (!cursor) return null;

  for (let guard = 0; guard < 500; guard += 1) {
    const end = calculateEndDate(cursor, duration);
    const conflicts = blockers.filter((blocker) =>
      rangesOverlap(cursor, end, blocker.mulai, blocker.estimasiSelesai),
    );

    if (conflicts.length === 0) return cursor;

    const latestEnd = conflicts.reduce((latest, blocker) => {
      const blockerEnd = coerceDateKey(blocker.estimasiSelesai);
      return blockerEnd && blockerEnd > latest ? blockerEnd : latest;
    }, cursor);

    cursor = addDays(latestEnd, 1);
  }

  return cursor;
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

export function defaultShiftReason(urgent) {
  const name = urgent?.nama_orang_req || 'request prioritas';
  return `Tergeser oleh ${name} (${urgent?.prioritas || PRIORITY.URGENT}).`;
}

function buildShiftedRequest(item, urgent, start, end, reason) {
  const before = {
    mulai: coerceDateKey(item.mulai),
    estimasiSelesai: coerceDateKey(item.estimasiSelesai),
  };
  const after = { mulai: start, estimasiSelesai: end };

  return {
    ...item,
    mulai: start,
    durasiHari: durationOf(item),
    estimasiSelesai: end,
    roadmap: syncRoadmapDates(item.roadmap ?? [], start),
    jadwalAsli: item.jadwalAsli ?? before,
    tergeserOleh: urgent?.id ?? null,
    alasanTergeser: reason,
    jumlahTergeser: (Number(item.jumlahTergeser) || 0) + 1,
    riwayatJadwal: appendHistory(item, {
      tipe: 'digeser',
      olehId: urgent?.id ?? null,
      dari: before,
      ke: after,
      alasan: reason,
    }),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Menyusun rencana pergeseran tanpa mengubah data asli.
 * `selectedIds` menentukan proyek mana yang ikut digeser.
 */
export function buildShiftPlan(requests, urgent, { selectedIds = [], reasons = {} } = {}) {
  const start = coerceDateKey(urgent?.mulai);
  const end = coerceDateKey(urgent?.estimasiSelesai);
  if (!start || !end) return { items: [], count: 0, totalDays: 0 };

  const selected = new Set(Array.from(selectedIds, (id) => String(id)));
  const candidates = findOverlapCandidates(requests, urgent, {
    scope: urgent?.lingkupGeser || SHIFT_SCOPE.ALL,
  })
    .filter((item) => selected.has(String(item.id)) && !item.jadwalTerkunci)
    .sort(shiftOrder);

  if (candidates.length === 0) return { items: [], count: 0, totalDays: 0 };

  const candidateIds = new Set(candidates.map((item) => String(item.id)));
  const blockers = requests.filter(
    (item) =>
      isActive(item) &&
      hasSchedule(item) &&
      String(item.id) !== String(urgent?.id) &&
      !candidateIds.has(String(item.id)),
  );

  let cursor = addDays(end, 1);
  const plan = [];

  for (const item of candidates) {
    const duration = durationOf(item);
    const newStart = findNextFreeStart(cursor, duration, blockers);
    if (!newStart) continue;

    const newEnd = calculateEndDate(newStart, duration);
    const reason = String(reasons[item.id] ?? '').trim() || defaultShiftReason(urgent);
    const updated = buildShiftedRequest(item, urgent, newStart, newEnd, reason);

    plan.push({
      id: item.id,
      request: item,
      updated,
      before: {
        mulai: coerceDateKey(item.mulai),
        estimasiSelesai: coerceDateKey(item.estimasiSelesai),
      },
      after: { mulai: newStart, estimasiSelesai: newEnd },
      daysShifted: Math.max(0, diffDays(item.mulai, newStart)),
    });

    blockers.push({ id: item.id, mulai: newStart, estimasiSelesai: newEnd });
    cursor = addDays(newEnd, 1);
  }

  return {
    items: plan,
    count: plan.length,
    totalDays: plan.reduce((total, entry) => total + entry.daysShifted, 0),
  };
}

/**
 * Menyusun rencana pemulihan untuk proyek yang pernah digeser oleh request tertentu.
 */
export function buildRestorePlan(requests, urgentId) {
  const targets = requests
    .filter(
      (item) =>
        isActive(item) &&
        String(item.tergeserOleh) === String(urgentId) &&
        item.jadwalAsli?.mulai,
    )
    .sort((a, b) => String(a.jadwalAsli.mulai).localeCompare(String(b.jadwalAsli.mulai)));

  if (targets.length === 0) return { items: [], count: 0, totalDays: 0 };

  const targetIds = new Set(targets.map((item) => String(item.id)));
  const blockers = requests.filter(
    (item) =>
      isActive(item) &&
      hasSchedule(item) &&
      !targetIds.has(String(item.id)),
  );

  const plan = [];

  for (const item of targets) {
    const duration = durationOf(item);
    const targetStart = item.jadwalAsli.mulai;
    const newStart = findNextFreeStart(targetStart, duration, blockers);
    if (!newStart) continue;

    const newEnd = calculateEndDate(newStart, duration);
    const before = {
      mulai: coerceDateKey(item.mulai),
      estimasiSelesai: coerceDateKey(item.estimasiSelesai),
    };
    const after = { mulai: newStart, estimasiSelesai: newEnd };
    const usedNearestSlot = newStart !== normalizeStart(targetStart);

    const updated = {
      ...item,
      mulai: newStart,
      durasiHari: duration,
      estimasiSelesai: newEnd,
      roadmap: syncRoadmapDates(item.roadmap ?? [], newStart),
      tergeserOleh: null,
      alasanTergeser: null,
      jadwalAsli: null,
      riwayatJadwal: appendHistory(item, {
        tipe: 'dipulihkan',
        olehId: urgentId ?? null,
        dari: before,
        ke: after,
        alasan: usedNearestSlot
          ? 'Dipulihkan ke slot terdekat karena jadwal asli sudah terpakai.'
          : 'Jadwal dipulihkan ke tanggal semula.',
      }),
      updatedAt: new Date().toISOString(),
    };

    plan.push({
      id: item.id,
      request: item,
      updated,
      before,
      after,
      daysShifted: Math.abs(diffDays(item.mulai, newStart)),
    });

    blockers.push({ id: item.id, mulai: newStart, estimasiSelesai: newEnd });
  }

  return {
    items: plan,
    count: plan.length,
    totalDays: plan.reduce((total, entry) => total + entry.daysShifted, 0),
  };
}

