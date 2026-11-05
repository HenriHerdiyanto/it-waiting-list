import { PIC_ROLES, PRIORITY, STATUS } from '../constants';
import { normalizePicNames } from './pic';

export const PIC_SCOPE = {
  ALL: 'all',
  ACTIVE: 'active',
  DONE: 'done',
};

export const UNASSIGNED_KEY = '__unassigned__';
export const UNREGISTERED_ROLE = 'Belum terdaftar';

export const STATUS_CHART_ORDER = [
  STATUS.WAITING,
  STATUS.ON_PROGRESS,
  STATUS.REVISI,
  STATUS.PENDING,
  STATUS.DONE,
];

const ROLE_ORDER = [...PIC_ROLES, UNREGISTERED_ROLE];

function keyOf(value) {
  return String(value ?? '').trim().toLowerCase();
}

function emptyStatusCounts() {
  return STATUS_CHART_ORDER.reduce((counts, status) => {
    counts[status] = 0;
    return counts;
  }, {});
}

function createRow({ key, nama, role, registered }) {
  return {
    key,
    nama,
    role,
    registered,
    total: 0,
    active: 0,
    done: 0,
    urgent: 0,
    counts: emptyStatusCounts(),
    requests: [],
  };
}

function addRequest(row, request) {
  row.total += 1;
  row.requests.push(request);

  if (request.status === STATUS.DONE) {
    row.done += 1;
  } else {
    row.active += 1;
  }

  if (request.prioritas === PRIORITY.URGENT) {
    row.urgent += 1;
  }

  row.counts[request.status] = (row.counts[request.status] ?? 0) + 1;
}

/** Menyaring request sesuai rentang beban yang sedang dilihat. */
export function filterRequestsByScope(requests, scope) {
  if (scope === PIC_SCOPE.ACTIVE) {
    return requests.filter((request) => request.status !== STATUS.DONE);
  }

  if (scope === PIC_SCOPE.DONE) {
    return requests.filter((request) => request.status === STATUS.DONE);
  }

  return requests;
}

/**
 * Menggabungkan PIC dari master dan dari request.
 * Satu request dengan beberapa PIC dihitung sebagai satu penugasan untuk tiap PIC.
 */
export function buildPicStats(requests, pics) {
  const masterByName = new Map();

  (Array.isArray(pics) ? pics : []).forEach((pic) => {
    const key = keyOf(pic?.nama);
    if (!key || masterByName.has(key)) return;
    masterByName.set(key, pic);
  });

  const rowMap = new Map();

  masterByName.forEach((pic, key) => {
    rowMap.set(
      key,
      createRow({
        key,
        nama: pic.nama,
        role: pic.role || UNREGISTERED_ROLE,
        registered: true,
      }),
    );
  });

  const unassigned = {
    ...createRow({
      key: UNASSIGNED_KEY,
      nama: 'Belum ada PIC',
      role: 'Tanpa PIC',
      registered: false,
    }),
    isUnassigned: true,
  };

  requests.forEach((request) => {
    const names = normalizePicNames(request.PIC);

    if (names.length === 0) {
      addRequest(unassigned, request);
      return;
    }

    names.forEach((nama) => {
      const key = keyOf(nama);
      if (!key) return;

      let row = rowMap.get(key);

      if (!row) {
        row = {
          ...createRow({
            key,
            nama,
            role: UNREGISTERED_ROLE,
            registered: false,
          }),
          isUnregistered: true,
        };
        rowMap.set(key, row);
      }

      addRequest(row, request);
    });
  });

  const rows = [...rowMap.values()]
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.active !== a.active) return b.active - a.active;
      return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const involvedRows = rows.filter((row) => row.total > 0);
  const totalAssignments = involvedRows.reduce((sum, row) => sum + row.total, 0);
  const roleCounts = new Map();

  involvedRows.forEach((row) => {
    roleCounts.set(row.role, (roleCounts.get(row.role) ?? 0) + row.total);
  });

  const orderedRoles = [...ROLE_ORDER];
  roleCounts.forEach((_, role) => {
    if (!orderedRoles.includes(role)) orderedRoles.push(role);
  });

  const roleTotals = orderedRoles
    .filter((role) => (roleCounts.get(role) ?? 0) > 0)
    .map((role) => ({ role, count: roleCounts.get(role) ?? 0 }));

  return {
    rows,
    unassigned: unassigned.total > 0 ? unassigned : null,
    roleTotals,
    summary: {
      totalRequests: requests.length,
      requestsWithPic: requests.length - unassigned.total,
      totalAssignments,
      involvedPics: involvedRows.length,
      registeredPics: masterByName.size,
      idlePics: rows.filter((row) => row.registered && row.total === 0).length,
      average: involvedRows.length > 0 ? totalAssignments / involvedRows.length : 0,
      busiest: involvedRows[0] ?? null,
      unassignedCount: unassigned.total,
    },
  };
}

/** Filter grafik berdasarkan role dan kata kunci nama PIC. */
export function filterPicRows(rows, { role = 'all', search = '' } = {}) {
  const term = search.trim().toLowerCase();

  return rows.filter((row) => {
    if (role !== 'all' && row.role !== role) return false;
    if (!term) return true;
    return `${row.nama} ${row.role}`.toLowerCase().includes(term);
  });
}
