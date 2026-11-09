export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_SIZE_MB = 10;
// Cloudinary Free membatasi file 10 MB (desimal), jadi samakan batasnya.
export const MAX_ATTACHMENT_SIZE = MAX_ATTACHMENT_SIZE_MB * 1000 * 1000;

export const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

export const ATTACHMENT_ACCEPT = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  ...ALLOWED_ATTACHMENT_TYPES,
].join(',');

function fileNameFromUrl(value) {
  const url = String(value ?? '').split('?')[0];
  const lastPart = url.split('/').filter(Boolean).pop() ?? '';

  try {
    return decodeURIComponent(lastPart);
  } catch {
    return lastPart;
  }
}

export function normalizeAttachments(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();
  const attachments = [];

  value.forEach((entry, index) => {
    if (!entry) return;

    const source = typeof entry === 'string' ? { url: entry } : entry;
    if (typeof source !== 'object') return;

    const url = String(source.url ?? '').trim();
    if (!url) return;

    const key = url.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    const size = Number(source.size);

    attachments.push({
      id: source.id ? String(source.id) : `attachment-${index + 1}`,
      name: String(source.name ?? fileNameFromUrl(url) ?? '').trim() || 'Lampiran',
      type: String(source.type ?? '').trim(),
      size: Number.isFinite(size) && size > 0 ? Math.floor(size) : 0,
      url,
    });
  });

  return attachments;
}

export function validateAttachmentFile(file) {
  if (!file) return 'File tidak valid.';

  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return `File "${file.name}" harus berupa gambar JPG/PNG/WEBP/GIF atau PDF.`;
  }

  if (file.size <= 0) {
    return `File "${file.name}" kosong.`;
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    return `File "${file.name}" melebihi batas ${MAX_ATTACHMENT_SIZE_MB} MB.`;
  }

  return null;
}

export function isImageAttachment(attachment) {
  const type = String(attachment?.type ?? '').toLowerCase();
  if (type.startsWith('image/')) return true;

  const url = String(attachment?.url ?? '').toLowerCase().split('?')[0];
  return /\.(jpe?g|png|webp|gif)$/.test(url);
}

export function isPdfAttachment(attachment) {
  const type = String(attachment?.type ?? '').toLowerCase();
  if (type === 'application/pdf') return true;

  const url = String(attachment?.url ?? '').toLowerCase().split('?')[0];
  return /\.pdf$/.test(url);
}

/** Hanya izinkan URL http(s) atau path relatif yang aman. */
export function isSafeAttachmentUrl(value) {
  const text = String(value ?? '').trim();
  if (!text || text.startsWith('//')) return false;
  if (text.startsWith('/')) return true;

  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
