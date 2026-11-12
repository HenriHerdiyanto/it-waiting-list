export const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3001/requests';

function derivePicsUrl(url) {
  const clean = String(url ?? '').replace(/\/+$/, '');
  if (/\/requests$/i.test(clean)) return clean.replace(/\/requests$/i, '/pics');
  return `${clean}/pics`;
}

export const PICS_API_URL =
  import.meta.env.VITE_PIC_API_URL || derivePicsUrl(API_URL);

export const ADMIN_USER = import.meta.env.VITE_ADMIN_USER || 'admin';
export const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS || 'admin123';
