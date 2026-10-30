import { API_URL } from './config';

async function request(path = '', options = {}) {
  const config = {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  };

  const response = await fetch(`${API_URL}${path}`, config);

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

export const fetchRequests = () => request();

export const createRequest = (payload) =>
  request('', { method: 'POST', body: JSON.stringify(payload) });

export const updateRequest = (id, payload) =>
  request(`/${id}`, { method: 'PUT', body: JSON.stringify(payload) });

export const deleteRequest = (id) => request(`/${id}`, { method: 'DELETE' });

/**
 * Menyimpan perubahan urutan secara batch.
 * Hanya item yang benar-benar berubah yang dikirim, dan error dilempar
 * jika ada satu saja yang gagal agar UI bisa melakukan rollback.
 */
export async function saveOrderChanges(items) {
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
