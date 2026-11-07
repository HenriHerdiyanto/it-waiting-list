import { validateAttachmentFile } from '../utils/attachments';

const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL || '/api/uploads';

/**
 * Mengunggah file ke server upload. Dipanggil saat form disimpan agar
 * pembatalan edit tidak meninggalkan file yang tidak terpakai.
 */
export async function uploadFiles(files) {
  if (!Array.isArray(files) || files.length === 0) return [];

  files.forEach((file) => {
    const error = validateAttachmentFile(file);
    if (error) throw new Error(error);
  });

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
