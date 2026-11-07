export const MAX_LINKS = 10;

let linkCounter = 0;

export function makeLinkId() {
  linkCounter += 1;

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `link-${crypto.randomUUID()}`;
  }

  return `link-${Date.now().toString(36)}-${linkCounter}`;
}

/** Menambahkan https:// jika pengguna mengetik domain tanpa protokol. */
export function normalizeLinkUrl(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (/^[a-z][a-z\d+.-]*:/i.test(text)) return text;

  return `https://${text.replace(/^\/+/, '')}`;
}

export function isValidLinkUrl(value) {
  try {
    const url = new URL(String(value ?? '').trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Menormalkan link dari data baru maupun data lama berbentuk string URL. */
export function normalizeLinks(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();
  const links = [];

  value.forEach((entry, index) => {
    if (!entry) return;

    const source = typeof entry === 'string' ? { url: entry } : entry;
    if (typeof source !== 'object') return;

    const url = String(source.url ?? '').trim();
    if (!url) return;

    const key = url.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    links.push({
      id: source.id ? String(source.id) : `link-${index + 1}`,
      label: String(source.label ?? source.judul ?? '').trim(),
      url,
    });
  });

  return links;
}

export function formatLinkLabel(link) {
  const label = String(link?.label ?? '').trim();
  if (label) return label;

  try {
    const url = new URL(String(link?.url ?? '').trim());
    return url.hostname.replace(/^www\./i, '') || link.url;
  } catch {
    return String(link?.url ?? '');
  }
}
