import {
  EMPTY_FORM,
  PRIORITY,
  STATUS,
} from '../constants';
import { calculateEndDate, normalizeStart, todayKey } from './date';
import { normalizePicNames } from './pic';
import { balanceRoadmap, validateRoadmap } from './roadmap';

export function createEmptyForm() {
  const mulai = todayKey();

  return {
    ...EMPTY_FORM,
    divisi: [],
    roadmap: [],
    mulai,
    durasiHari: 1,
    estimasiSelesai: calculateEndDate(mulai, 1),
  };
}

export function formFromRequest(request) {
  if (!request) return createEmptyForm();

  return {
    nama_orang_req: request.nama_orang_req,
    divisi: [...request.divisi],
    deskripsi: request.deskripsi,
    deskripsiRevisi: request.deskripsiRevisi ?? '',
    PIC: normalizePicNames(request.PIC),
    status: request.status,
    is_priority: request.is_priority,
    prioritas: request.prioritas,
    alasanPrioritas: request.alasanPrioritas,
    kebijakanGeser: request.kebijakanGeser,
    lingkupGeser: request.lingkupGeser,
    jadwalTerkunci: request.jadwalTerkunci,
    mulai: request.mulai ?? '',
    durasiHari: request.durasiHari ?? 1,
    estimasiSelesai: request.estimasiSelesai ?? '',
    roadmap: request.roadmap.map((step) => ({ ...step })),
  };
}

export function buildRequestPayload(form, existing) {
  const now = new Date().toISOString();
  const mulai = normalizeStart(form.mulai);
  const durasiHari = Math.max(1, Math.floor(Number(form.durasiHari) || 1));
  const estimasiSelesai = mulai ? calculateEndDate(mulai, durasiHari) : null;
  const sourceRoadmap = Array.isArray(form.roadmap) ? form.roadmap : [];
  // Rapikan total durasi roadmap jika pengguna mengubah durasi request.
  const roadmap =
    sourceRoadmap.length > 0 ? balanceRoadmap(sourceRoadmap, durasiHari, mulai) : [];
  const status = form.status;
  const prioritas = form.prioritas;
  const previousWasDone = existing?.status === STATUS.DONE;

  return {
    ...(existing ?? {}),
    nama_orang_req: form.nama_orang_req.trim(),
    divisi: form.divisi,
    deskripsi: form.deskripsi,
    deskripsiRevisi: String(form.deskripsiRevisi ?? '').trim(),
    PIC: normalizePicNames(form.PIC),
    status,
    prioritas,
    is_priority: prioritas !== PRIORITY.NORMAL,
    alasanPrioritas: form.alasanPrioritas.trim(),
    kebijakanGeser: form.kebijakanGeser,
    lingkupGeser: form.lingkupGeser,
    jadwalTerkunci: form.jadwalTerkunci,
    mulai,
    durasiHari,
    estimasiSelesai,
    roadmap,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    actualStart:
      existing?.actualStart ?? (status === STATUS.ON_PROGRESS ? now : null),
    doneAt:
      status === STATUS.DONE
        ? previousWasDone
          ? existing.doneAt ?? now
          : now
        : status === STATUS.REVISI
          ? existing?.doneAt ?? null
          : null,
  };
}

export function validateRequestPayload(payload) {
  if (!payload.nama_orang_req.trim() || !payload.deskripsi.trim()) {
    return 'Nama requester dan deskripsi wajib diisi.';
  }

  if (payload.status === STATUS.REVISI && !payload.deskripsiRevisi.trim()) {
    return 'Deskripsi revisi wajib diisi saat status Revisi.';
  }

  if (payload.status !== STATUS.DONE) {
    if (!payload.mulai) return 'Tanggal mulai wajib diisi untuk request aktif.';
    if (!payload.estimasiSelesai) {
      return 'Estimasi selesai tidak valid. Periksa tanggal mulai dan durasi.';
    }
  }

  if (payload.prioritas === PRIORITY.URGENT && !payload.alasanPrioritas) {
    return 'Alasan prioritas wajib diisi untuk request Urgent.';
  }

  return validateRoadmap(payload.roadmap, payload.durasiHari);
}
