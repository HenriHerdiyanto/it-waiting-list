const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value) {
  return String(value).padStart(2, '0');
}

/** Mengubah Date menjadi kunci tanggal lokal YYYY-MM-DD. */
export function toDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Mengubah Date/ISO string/YYYY-MM-DD menjadi kunci tanggal lokal. */
export function coerceDateKey(value) {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) return toDateKey(value);

  const text = String(value).trim();
  const match = DATE_KEY_PATTERN.exec(text);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return text;
  }

  const parsed = new Date(text);
  return toDateKey(parsed);
}

/** Parse YYYY-MM-DD menjadi Date lokal (bukan UTC). */
export function parseDateKey(value) {
  const key = coerceDateKey(value);
  if (!key) return null;

  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function todayKey() {
  return toDateKey(new Date());
}

/**
 * Semua hari dihitung, termasuk Sabtu/Minggu dan hari libur.
 * Fungsi ini hanya menormalkan format tanggal.
 */
export function normalizeStart(value) {
  return coerceDateKey(value);
}

/** Menambahkan sejumlah hari kalender (0 = tanggal itu sendiri). */
export function addDays(value, days) {
  const start = parseDateKey(value);
  if (!start) return null;

  const amount = Math.max(0, Math.floor(Number(days) || 0));
  start.setDate(start.getDate() + amount);

  return toDateKey(start);
}

/** Estimasi selesai inklusif: mulai + (durasi - 1) hari kalender. */
export function calculateEndDate(startKey, durationDays) {
  const duration = Math.max(1, Math.floor(Number(durationDays) || 1));
  return addDays(startKey, duration - 1);
}

/** Jumlah hari kalender dari start sampai end (inklusif). */
export function daysBetween(startKey, endKey) {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  if (!start || !end || end < start) return 0;

  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

/** Berapa hari kalender keterlambatan dari estimasi selesai sampai hari ini. */
export function countOverdueDays(endKey, today = todayKey()) {
  const end = parseDateKey(endKey);
  const current = parseDateKey(today);
  if (!end || !current || current <= end) return 0;

  const nextDay = new Date(end);
  nextDay.setDate(nextDay.getDate() + 1);

  return daysBetween(toDateKey(nextDay), today);
}

/** Cek dua rentang tanggal apakah bentrok (inklusif). */
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  const startA = coerceDateKey(aStart);
  const endA = coerceDateKey(aEnd);
  const startB = coerceDateKey(bStart);
  const endB = coerceDateKey(bEnd);

  if (!startA || !endA || !startB || !endB) return false;

  return startA <= endB && endA >= startB;
}

/** Selisih hari kalender bertanda: positif jika toKey setelah fromKey. */
export function diffDays(fromKey, toKey) {
  if (!fromKey || !toKey) return 0;
  if (toKey === fromKey) return 0;

  if (toKey > fromKey) {
    const nextDay = addDays(fromKey, 1);
    return daysBetween(nextDay, toKey);
  }

  const nextDay = addDays(toKey, 1);
  return -daysBetween(nextDay, fromKey);
}
