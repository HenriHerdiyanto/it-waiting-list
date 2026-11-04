import { API_URL, PICS_API_URL } from './config';

async function request(url, options = {}) {
  const config = {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch {
      // Abaikan kegagalan membaca body error.
    }
    throw new Error(detail || `Permintaan ke server gagal (${response.status}).`);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const fetchRequests = () => request(API_URL);

export const createRequest = (payload) =>
  request(API_URL, { method: 'POST', body: JSON.stringify(payload) });

export const updateRequest = (id, payload) =>
  request(`${API_URL}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });

export const deleteRequest = (id) =>
  request(`${API_URL}/${id}`, { method: 'DELETE' });

/**
 * Menyimpan banyak perubahan sekaligus (urutan dan penambahan keterangan bentrok).
 * Error dilempar jika ada satu saja yang gagal agar UI bisa melakukan rollback.
 */
export async function saveBatch(items) {
  if (items.length === 0) return;

  const results = await Promise.allSettled(
    items.map((item) => updateRequest(item.id, item)),
  );

  const failed = results.filter((result) => result.status === 'rejected');
  if (failed.length > 0) {
    const reason = failed[0].reason;
    throw new Error(reason instanceof Error ? reason.message : 'Sebagian data gagal disimpan.');
  }
}

// Alias lama agar pemanggil yang sudah ada tetap berjalan.
export const saveOrderChanges = saveBatch;

/* ------------------------------- Master PIC ------------------------------- */

export const fetchPics = () => request(PICS_API_URL);

export const createPic = (payload) =>
  request(PICS_API_URL, { method: 'POST', body: JSON.stringify(payload) });

export const updatePic = (id, payload) =>
  request(`${PICS_API_URL}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });

export const deletePic = (id) =>
  request(`${PICS_API_URL}/${id}`, { method: 'DELETE' });
