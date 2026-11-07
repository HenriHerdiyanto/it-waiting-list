import {
  EMPTY_FORM,
  PRIORITY,
  STATUS,
} from '../constants';
import { calculateEndDate, normalizeStart } from './date';
import {
  MAX_ATTACHMENTS,
  normalizeAttachments,
} from './attachments';
import {
  isValidLinkUrl,
  MAX_LINKS,
  normalizeLinks,
  normalizeLinkUrl,
} from './links';
import { normalizePicNames } from './pic';
import { balanceRoadmap, validateRoadmap } from './roadmap';

export function createEmptyForm() {
  return {
    ...EMPTY_FORM,
    divisi: [],
    links: [],
    attachments: [],
    pendingFiles: [],
    roadmap: [],
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
    links: normalizeLinks(request.links),
    attachments: normalizeAttachments(request.attachments),
    pendingFiles: [],
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
  const links = normalizeLinks(form.links).map((link) => ({
    ...link,
    url: normalizeLinkUrl(link.url),
  }));
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
    links,
    attachments: normalizeAttachments(form.attachments),
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

  if (payload.prioritas === PRIORITY.URGENT && !payload.alasanPrioritas) {
    return 'Alasan prioritas wajib diisi untuk request Urgent.';
  }

  if (payload.links.length > MAX_LINKS) {
    return `Maksimal ${MAX_LINKS} link tambahan per request.`;
  }

  const invalidLink = payload.links.find((link) => !isValidLinkUrl(link.url));
  if (invalidLink) {
    return `Link tambahan "${invalidLink.label || invalidLink.url}" tidak valid. Gunakan URL http:// atau https://.`;
  }

  if (payload.attachments.length > MAX_ATTACHMENTS) {
    return `Maksimal ${MAX_ATTACHMENTS} lampiran per request.`;
  }

  return validateRoadmap(payload.roadmap, payload.durasiHari);
}
