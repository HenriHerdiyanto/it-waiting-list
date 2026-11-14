import { resolveAttachmentType, validateAttachmentFile } from '../utils/attachments';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const SUPABASE_BUCKET =
  String(import.meta.env.VITE_SUPABASE_BUCKET || '').trim() || 'attachments';
const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

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

function defaultProvider() {
  if (HAS_SUPABASE) return 'supabase';
  if (CLOUDINARY_UPLOAD_URL && CLOUDINARY_UPLOAD_PRESET) return 'cloudinary';
  return 'local';
}

const UPLOAD_PROVIDER = String(
  import.meta.env.VITE_UPLOAD_PROVIDER || defaultProvider(),
).trim().toLowerCase();

/** Salinan file dengan MIME type yang benar (browser kadang mengosongkan tipe .doc/.docx). */
function withResolvedType(file) {
  const type = resolveAttachmentType(file);
  if (!type || type === file.type) return file;
  return new File([file], file.name, { type, lastModified: file.lastModified });
}

let supabaseClientPromise = null;

function getSupabaseClient() {
  if (!supabaseClientPromise) {
    // Dimuat saat dibutuhkan agar tidak menambah ukuran bundle awal.
    supabaseClientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    );
  }
  return supabaseClientPromise;
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function uploadToSupabase(file) {
  if (!HAS_SUPABASE) {
    throw new Error(
      'Konfigurasi Supabase belum lengkap. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.',
    );
  }

  const supabase = await getSupabaseClient();
  const typedFile = withResolvedType(file);
  const extension = (/\.([a-z0-9]+)$/i.exec(file.name || '')?.[1] || '').toLowerCase();
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const path = `${now.getFullYear()}/${month}/${randomId()}${extension ? `.${extension}` : ''}`;

  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, typedFile, {
    contentType: typedFile.type || undefined,
    cacheControl: '31536000',
    upsert: false,
  });

  if (error) {
    throw new Error(`Upload "${file.name}" ke Supabase gagal: ${error.message}`);
  }

  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('URL publik lampiran dari Supabase tidak tersedia.');
  }

  return {
    id: path,
    name: file.name || 'Lampiran',
    type: typedFile.type,
    size: file.size,
    url: data.publicUrl,
  };
}

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
  body.append('file', withResolvedType(file), file.name);
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
    payload.resource_type === 'image' && format
      ? `image/${format}`
      : resolveAttachmentType(file);

  return {
    id: String(payload.asset_id || payload.public_id || file.name),
    name: file.name || payload.original_filename || 'Lampiran',
    type: resolveAttachmentType(file) || fallbackType,
    size: Number(payload.bytes) > 0 ? Number(payload.bytes) : file.size,
    url: payload.secure_url,
  };
}

async function uploadToLocalServer(files) {
  const body = new FormData();
  files.forEach((file) => body.append('files', withResolvedType(file), file.name));

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
 * Mengunggah file ke storage. Urutan default:
 * 1. Supabase Storage jika VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY diisi
 *    (wajib untuk Vercel karena disk Vercel tidak permanen).
 * 2. Cloudinary jika kredensial Cloudinary diisi.
 * 3. Server upload lokal (/api/uploads) untuk development.
 * VITE_UPLOAD_PROVIDER=supabase|cloudinary|local dapat memaksa pilihan.
 */
export async function uploadFiles(files) {
  if (!Array.isArray(files) || files.length === 0) return [];

  validateFiles(files);

  if (UPLOAD_PROVIDER === 'supabase') {
    return Promise.all(files.map((file) => uploadToSupabase(file)));
  }

  if (UPLOAD_PROVIDER === 'cloudinary') {
    return Promise.all(files.map((file) => uploadToCloudinary(file)));
  }

  return uploadToLocalServer(files);
}
