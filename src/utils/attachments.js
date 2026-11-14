export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_SIZE_MB = 10;
// Cloudinary Free membatasi file 10 MB (desimal), jadi samakan batasnya.
export const MAX_ATTACHMENT_SIZE = MAX_ATTACHMENT_SIZE_MB * 1000 * 1000;

export const WORD_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  ...WORD_TYPES,
];

/** Tipe file berdasarkan ekstensi, dipakai jika browser tidak mengisi file.type. */
const TYPE_BY_EXTENSION = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export const ATTACHMENT_ACCEPT = [
  ...Object.keys(TYPE_BY_EXTENSION).map((extension) => `.${extension}`),
  ...ALLOWED_ATTACHMENT_TYPES,
].join(',');

export const ATTACHMENT_HINT = 'Gambar JPG/PNG/WEBP/GIF, PDF, atau Word (DOC/DOCX)';

function extensionOf(value) {
  const match = /\.([a-z0-9]+)$/i.exec(String(value ?? '').split('?')[0]);
  return match ? match[1].toLowerCase() : '';
}

/** MIME type file; jika kosong (sering terjadi untuk .doc/.docx), ditebak dari ekstensi. */
export function resolveAttachmentType(file) {
  const type = String(file?.type ?? '').trim().toLowerCase();
  if (type && type !== 'application/octet-stream') return type;
  return TYPE_BY_EXTENSION[extensionOf(file?.name)] ?? type;
}

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

  if (!ALLOWED_ATTACHMENT_TYPES.includes(resolveAttachmentType(file))) {
    return `File "${file.name}" harus berupa ${ATTACHMENT_HINT}.`;
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

export function isWordAttachment(attachment) {
  const type = String(attachment?.type ?? '').toLowerCase();
  if (WORD_TYPES.includes(type)) return true;

  const extension = extensionOf(attachment?.url) || extensionOf(attachment?.name);
  return extension === 'doc' || extension === 'docx';
}

export function attachmentKindLabel(attachment) {
  if (isImageAttachment(attachment)) return 'Gambar';
  if (isPdfAttachment(attachment)) return 'PDF';
  if (isWordAttachment(attachment)) return 'Word';
  return 'File';
}

function isPublicHttpUrl(value) {
  try {
    const url = new URL(String(value ?? ''));
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return !['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
  } catch {
    return false;
  }
}

/**
 * URL untuk membuka lampiran di tab baru. Browser tidak bisa menampilkan
 * Word secara langsung, jadi file Word yang URL-nya publik dibuka lewat
 * Microsoft Office Online Viewer. Selain itu URL asli dipakai apa adanya.
 */
export function getAttachmentViewUrl(attachment) {
  const url = String(attachment?.url ?? '').trim();
  if (!isSafeAttachmentUrl(url)) return '';

  if (isWordAttachment(attachment) && isPublicHttpUrl(url)) {
    return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
  }

  return url;
}
