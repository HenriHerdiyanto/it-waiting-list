import { addDays, calculateEndDate, normalizeStart } from './date';

const STEP_STATUS = new Set(['todo', 'progress', 'done', 'skipped']);

function normalizeStepStatus(value) {
  const status = String(value ?? '').trim().toLowerCase();
  if (['progress', 'on progress', 'onprogress', 'in progress', 'proses'].includes(status)) {
    return 'progress';
  }

  return STEP_STATUS.has(status) ? status : 'todo';
}

let stepCounter = 0;

export function makeStepId() {
  stepCounter += 1;
  return `step-${Date.now().toString(36)}-${stepCounter}`;
}

function toDuration(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) return 1;
  return Math.max(1, Math.floor(number));
}

export function normalizeRoadmap(value, startKey) {
  if (!Array.isArray(value)) return [];

  const steps = value
    .filter((step) => step && typeof step === 'object')
    .map((step, index) => {
      return {
        id: step.id ? String(step.id) : `step-${index + 1}`,
        judul: String(step.judul ?? step.title ?? '').trim(),
        deskripsi: String(step.deskripsi ?? step.description ?? ''),
        durasiHari: toDuration(step.durasiHari ?? step.durationDays),
        status: normalizeStepStatus(step.status),
      };
    });

  return syncRoadmapDates(steps, startKey);
}

/** Menghitung ulang tanggal semua langkah secara berurutan. */
export function syncRoadmapDates(roadmap, startKey) {
  let cursor = normalizeStart(startKey);

  return roadmap.map((step) => {
    const duration = toDuration(step.durasiHari);
    if (!cursor) {
      return { ...step, durasiHari: duration, mulai: null, selesai: null };
    }

    const end = calculateEndDate(cursor, duration);
    const next = addDays(end, 1);
    const result = { ...step, durasiHari: duration, mulai: cursor, selesai: end };
    cursor = next;
    return result;
  });
}

export function totalRoadmapDays(roadmap) {
  if (!Array.isArray(roadmap)) return 0;
  return roadmap.reduce((total, step) => total + toDuration(step.durasiHari), 0);
}

export function roadmapProgress(roadmap) {
  if (!Array.isArray(roadmap) || roadmap.length === 0) {
    return { completed: 0, total: 0, percent: 0 };
  }

  const completed = roadmap.filter(
    (step) => step.status === 'done' || step.status === 'skipped',
  ).length;

  return {
    completed,
    total: roadmap.length,
    percent: Math.round((completed / roadmap.length) * 100),
  };
}

export function generateDailyRoadmap(startKey, durationDays) {
  const duration = Math.max(1, Math.floor(Number(durationDays) || 1));

  const steps = Array.from({ length: duration }, (_, index) => ({
    id: makeStepId(),
    judul: `Hari ke-${index + 1}`,
    deskripsi: '',
    durasiHari: 1,
    status: 'todo',
  }));

  return syncRoadmapDates(steps, startKey);
}

export function createRoadmapStep(index = 0) {
  return {
    id: makeStepId(),
    judul: `Langkah ${index + 1}`,
    deskripsi: '',
    durasiHari: 1,
    status: 'todo',
  };
}

/** Mengembalikan pesan kesalahan, atau null jika roadmap valid. */
export function validateRoadmap(roadmap, durationDays) {
  if (!Array.isArray(roadmap) || roadmap.length === 0) return null;

  if (roadmap.some((step) => !String(step.judul ?? '').trim())) {
    return 'Semua langkah roadmap wajib memiliki judul.';
  }

  const total = totalRoadmapDays(roadmap);
  const target = Math.max(1, Math.floor(Number(durationDays) || 1));

  if (total !== target) {
    return `Total durasi roadmap (${total} hari) harus sama dengan durasi request (${target} hari).`;
  }

  return null;
}

/** Menyesuaikan total durasi langkah agar sama dengan durasi request. */
export function balanceRoadmap(roadmap, durationDays, startKey) {
  const target = Math.max(1, Math.floor(Number(durationDays) || 1));
  const steps = Array.isArray(roadmap) ? [...roadmap] : [];

  if (steps.length === 0) {
    return generateDailyRoadmap(startKey, target);
  }

  let total = totalRoadmapDays(steps);

  if (total < target) {
    const last = steps.length - 1;
    steps[last] = {
      ...steps[last],
      durasiHari: toDuration(steps[last].durasiHari) + (target - total),
    };
  } else if (total > target) {
    let excess = total - target;

    for (let index = steps.length - 1; index >= 0 && excess > 0; index -= 1) {
      const current = toDuration(steps[index].durasiHari);
      const reduction = Math.min(current, excess);

      if (current - reduction <= 0) {
        steps.splice(index, 1);
        excess -= current;
      } else {
        steps[index] = {
          ...steps[index],
          durasiHari: current - reduction,
        };
        excess -= reduction;
      }
    }
  }

  return syncRoadmapDates(steps, startKey);
}

