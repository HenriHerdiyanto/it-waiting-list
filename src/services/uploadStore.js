import { validateAttachmentFile } from '../utils/attachments';

const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL || '/api/uploads';
const CLOUDINARY_CLOUD_NAME = String(
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
).trim();
const CLOUDINARY_UPLOAD_PRESET = String(
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '',
).trim();
const CLOUDINARY_UPLOAD_URL = CLOUDINARY_CLOUD_NAME
  ? `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}/auto/upload`
  : '';

const UPLOAD_PROVIDER = String(
  import.meta.env.VITE_UPLOAD_PROVIDER ||
    (CLOUDINARY_UPLOAD_URL && CLOUDINARY_UPLOAD_PRESET ? 'cloudinary' : 'local'),
).toLowerCase();

function validateFiles(files) {
  files.forEach((file) => {
    const error = validateAttachmentFile(file);
    if (error) throw new Error(error);
  });
}

async function readJsonResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

async function uploadToCloudinary(file) {
  if (!CLOUDINARY_UPLOAD_URL || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      'Konfigurasi Cloudinary belum lengkap. Isi VITE_CLOUDINARY_CLOUD_NAME dan VITE_CLOUDINARY_UPLOAD_PRESET.',
    );
  }

  const body = new FormData();
  body.append('file', file, file.name);
  body.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  let response;
  try {
    response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body,
    });
  } catch {
    throw new Error(
      'Gagal menghubungi Cloudinary. Periksa koneksi internet lalu coba lagi.',
    );
  }

  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        `Upload ke Cloudinary gagal (${response.status}).`,
    );
  }

  if (!payload?.secure_url) {
    throw new Error('Respons Cloudinary tidak valid.');
  }

  const format = String(payload.format || '').toLowerCase();
  const fallbackType =
    payload.resource_type === 'image' && format ? `image/${format}` : '';

  return {
    id: String(payload.asset_id || payload.public_id || file.name),
    name: file.name || payload.original_filename || 'Lampiran',
    type: file.type || fallbackType,
    size: Number(payload.bytes) > 0 ? Number(payload.bytes) : file.size,
    url: payload.secure_url,
  };
}

async function uploadToLocalServer(files) {
  const body = new FormData();
  files.forEach((file) => body.append('files', file, file.name));

  let response;
  try {
    response = await fetch(UPLOAD_URL, {
      method: 'POST',
      body,
    });
  } catch {
    throw new Error(
      'Gagal menghubungi server upload. Pastikan server upload berjalan lalu coba lagi.',
    );
  }

  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      payload?.message || text || `Upload file gagal (${response.status}).`,
    );
  }

  if (!Array.isArray(payload)) {
    throw new Error('Respons server upload tidak valid.');
  }

  return payload;
}

/**
 * Mengunggah file ke storage. Secara default memakai server upload lokal
 * (/api/uploads). Jika VITE_UPLOAD_PROVIDER=cloudinary atau kredensial
 * Cloudinary diisi, file diunggah langsung dari browser ke Cloudinary.
 */
export async function uploadFiles(files) {
  if (!Array.isArray(files) || files.length === 0) return [];

  validateFiles(files);

  if (UPLOAD_PROVIDER === 'cloudinary') {
    return Promise.all(files.map((file) => uploadToCloudinary(file)));
  }

  return uploadToLocalServer(files);
}
