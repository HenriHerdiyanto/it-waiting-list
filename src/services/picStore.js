import {
  createPic as createPicApi,
  deletePic as deletePicApi,
  fetchPics,
  updatePic as updatePicApi,
} from '../api';
import { PIC_ROLES } from '../constants';

export const PIC_STORAGE_KEY = 'itwl:pics:v1';

export function normalizePic(raw = {}, index = 0) {
  const nama = String(raw.nama ?? raw.name ?? '').trim();
  const role = String(raw.role ?? '').trim().toUpperCase();

  return {
    ...raw,
    id: raw.id ?? `pic-local-${Date.now()}-${index}`,
    nama,
    role: PIC_ROLES.includes(role) ? role : role || 'BE',
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
  };
}

export function sortPics(list) {
  return [...list].sort((a, b) => {
    const roleA = PIC_ROLES.indexOf(a.role);
    const roleB = PIC_ROLES.indexOf(b.role);
    const weightA = roleA === -1 ? PIC_ROLES.length : roleA;
    const weightB = roleB === -1 ? PIC_ROLES.length : roleB;
    if (weightA !== weightB) return weightA - weightB;
    return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
  });
}

export function readLocalPics() {
  if (typeof window === 'undefined') return [];

  try {
    const raw = JSON.parse(window.localStorage.getItem(PIC_STORAGE_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.map(normalizePic) : [];
  } catch {
    return [];
  }
}

function writeLocalPics(list) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(PIC_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Penyimpanan penuh/diblokir: biarkan UI tetap menampilkan data di memori.
  }
}

function localId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `pic-${crypto.randomUUID()}`;
  }
  return `pic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Memuat master PIC dari API. Jika endpoint belum tersedia (mis. 404),
 * otomatis memakai penyimpanan localStorage agar fitur tetap berjalan.
 */
export async function loadPicStore() {
  try {
    const raw = await fetchPics();
    const pics = Array.isArray(raw) ? raw.map(normalizePic) : [];

    // Jika endpoint mengembalikan array kosong, jangan percaya mode api.
    // Tetap pakai localStorage agar data PIC yang sudah diimpor tidak hilang
    // setiap kali project dijalankan ulang.
    if (pics.length === 0) {
      return {
        pics: sortPics(readLocalPics()),
        mode: 'local',
        error: '',
      };
    }

    // Simpan salinan ke localStorage agar tetap ada walaupun endpoint tidak
    // tersedia pada saat load berikutnya.
    writeLocalPics(pics);
    return { pics: sortPics(pics), mode: 'api', error: '' };
  } catch (error) {
    return {
      pics: sortPics(readLocalPics()),
      mode: 'local',
      error: error instanceof Error ? error.message : 'Endpoint PIC tidak tersedia.',
    };
  }
}

export async function addPic(payload, mode) {
  const now = new Date().toISOString();
  const body = {
    nama: String(payload.nama ?? '').trim(),
    role: String(payload.role ?? '').trim().toUpperCase(),
    createdAt: now,
    updatedAt: now,
  };

  if (mode === 'api') {
    return normalizePic(await createPicApi(body));
  }

  const item = normalizePic({ ...body, id: localId() });
  writeLocalPics([...readLocalPics(), item]);
  return item;
}

export async function editPic(id, payload, mode) {
  const now = new Date().toISOString();
  const body = {
    nama: String(payload.nama ?? '').trim(),
    role: String(payload.role ?? '').trim().toUpperCase(),
    updatedAt: now,
  };

  if (mode === 'api') {
    return normalizePic(await updatePicApi(id, body));
  }

  const list = readLocalPics();
  const existing = list.find((item) => String(item.id) === String(id));
  const item = normalizePic({
    ...existing,
    ...body,
    id: existing?.id ?? id,
    createdAt: existing?.createdAt ?? now,
  });
  writeLocalPics(
    list.map((entry) => (String(entry.id) === String(id) ? item : entry)),
  );
  return item;
}

export async function removePic(id, mode) {
  if (mode === 'api') {
    await deletePicApi(id);
    return;
  }

  writeLocalPics(readLocalPics().filter((item) => String(item.id) !== String(id)));
}
