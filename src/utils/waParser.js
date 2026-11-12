import { DIVISI_OPTIONS, PRIORITY } from '../constants.js';

/*
 * Parser chat WhatsApp yang ditempel admin, untuk mengisi form request otomatis.
 * Berjalan sepenuhnya di browser (tanpa server / API key).
 *
 * Format baris yang dikenali:
 *   [10.15, 12/11/2026] Nama: pesan          (salin dari WhatsApp Web / Desktop)
 *   [12/11/26 10.15.32] Nama: pesan          (export chat iPhone)
 *   12/11/26 10.15 - Nama: pesan             (export chat Android)
 *   12/11/26, 10:15 - Nama: pesan            (export chat Android, locale lain)
 * Baris tanpa header dianggap lanjutan pesan sebelumnya. Teks tanpa header sama
 * sekali tetap diproses sebagai satu pesan tanpa nama pengirim.
 */

const DATE = String.raw`(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})`;
const TIME = String.raw`(\d{1,2}[.:]\d{2}(?:[.:]\d{2})?(?:\s?[APap]\.?[Mm]\.?)?)`;

const HEADER_PATTERNS = [
  // [10.15, 12/11/2026] Nama: pesan
  { re: new RegExp(String.raw`^‎?\[${TIME},\s*${DATE}\]\s*([^:]{1,60}?):\s?(.*)$`), time: 1, date: 2, name: 3, text: 4 },
  // [12/11/26 10.15.32] Nama: pesan  |  [12/11/26, 10.15.32] Nama: pesan
  { re: new RegExp(String.raw`^‎?\[${DATE},?\s+${TIME}\]\s*([^:]{1,60}?):\s?(.*)$`), date: 1, time: 2, name: 3, text: 4 },
  // 12/11/26 10.15 - Nama: pesan  |  12/11/26, 10:15 - Nama: pesan
  { re: new RegExp(String.raw`^‎?${DATE},?\s+${TIME}\s+[-–]\s+([^:]{1,60}?):\s?(.*)$`), date: 1, time: 2, name: 3, text: 4 },
];

const NOISE_PATTERNS = [
  /^<?\s*(media omitted|media tidak disertakan|file tidak disertakan)\s*>?$/i,
  /^(this message was deleted|pesan ini (telah )?dihapus)\.?$/i,
  /^(you deleted this message|anda menghapus pesan ini)\.?$/i,
  /^<?\s*this message was edited\s*>?$/i,
  /^.*\.(jpg|jpeg|png|webp|pdf|opus|mp4)\s*\((file|lampiran) (attached|terlampir)\)$/i,
  /^(image|gambar|video|sticker|stiker|audio|dokumen|document) omitted$/i,
];

const URL_RE = /\bhttps?:\/\/[^\s<>()]+[^\s<>().,!?;:'"]/gi;

// Kata kunci prioritas. Urgent diperiksa lebih dulu.
const URGENT_RE =
  /\b(urgent|urgen|asap|darurat|mendesak|segera|secepatnya|hari ini juga|sekarang juga|saat ini juga|down|error parah|tidak bisa (login|akses|transaksi))\b/i;
const HIGH_RE = /\b(penting|prioritas|dipercepat|tolong dipercepat|minggu ini|deadline|besok)\b/i;

// Alias tambahan untuk mendeteksi divisi dari isi pesan.
const DIVISI_ALIASES = {
  Rapspoint: [/\braps\s?point\b/i],
  Vender: [/\bvend[eo]r\b/i],
  Barapoint: [/\bbara\s?point\b/i],
  FMI: [/\bfmi\b/i],
  Aoshi: [/\baoshi\b/i],
  Station: [/\b(raps\s)?station\b/i],
};

const GREETING_RE =
  /^(assalamu'?alaikum( wr\.? ?wb\.?)?|selamat (pagi|siang|sore|malam)|pagi|siang|sore|malam|halo|hai|hi|permisi|maaf (mengganggu|ganggu))\b[\s,.!]*(pak|bu|mas|mba|mbak|kak|bang)?\s*[\w]*[\s,.!]*$/i;

const THANKS_RE = /^(terima ?kasih|makasih|thanks?|thank you|tq|ty|siap|ok(e|ay)?|baik)\b[\s\w,.!🙏]*$/i;

function cleanName(name) {
  return String(name ?? '')
    .replace(/[‎‏‪-‮]/g, '')
    .replace(/^~\s*/, '')
    .trim();
}

function isNoise(text) {
  const value = text.replace(/[\u200e\u200f\u202a-\u202e]/g, '').trim();
  if (!value) return true;
  return NOISE_PATTERNS.some((pattern) => pattern.test(value));
}

/** Memecah teks tempelan menjadi daftar pesan { sender, date, time, text }. */
export function splitMessages(raw) {
  const lines = String(raw ?? '').replace(/\r\n?/g, '\n').split('\n');
  const messages = [];
  let current = null;

  for (const line of lines) {
    let matched = null;

    for (const pattern of HEADER_PATTERNS) {
      const result = pattern.re.exec(line.trim());
      if (result) {
        matched = {
          sender: cleanName(result[pattern.name]),
          date: result[pattern.date],
          time: result[pattern.time],
          text: result[pattern.text] ?? '',
        };
        break;
      }
    }

    if (matched) {
      current = { ...matched, lines: [matched.text] };
      messages.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      current = { sender: '', date: '', time: '', lines: [line] };
      messages.push(current);
    }
  }

  return messages
    .map(({ lines: messageLines, ...rest }) => ({
      ...rest,
      text: messageLines
        .filter((value) => !isNoise(value))
        .join('\n')
        .trim(),
    }))
    .filter((message) => message.text);
}

/** Daftar pengirim unik, diurutkan dari yang paling banyak mengirim pesan. */
export function listSenders(messages) {
  const counts = new Map();
  messages.forEach(({ sender }) => {
    if (!sender) return;
    counts.set(sender, (counts.get(sender) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

function extractLinks(text) {
  const urls = text.match(URL_RE) ?? [];
  const seen = new Set();

  return urls
    .filter((url) => {
      const key = url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((url) => ({ label: '', url }));
}

function detectDivisi(text) {
  return DIVISI_OPTIONS.filter((divisi) => {
    const aliases = DIVISI_ALIASES[divisi] ?? [new RegExp(`\\b${divisi}\\b`, 'i')];
    return aliases.some((pattern) => pattern.test(text));
  });
}

function sentenceContaining(text, pattern) {
  const sentences = text.split(/(?<=[.!?\n])\s+/);
  const hit = sentences.find((sentence) => pattern.test(sentence));
  const value = (hit ?? '').replace(/\s+/g, ' ').trim();
  return value.length > 160 ? `${value.slice(0, 157)}...` : value;
}

function detectPriority(text, sender) {
  if (URGENT_RE.test(text)) {
    const quote = sentenceContaining(text, URGENT_RE);
    const who = sender ? ` oleh ${sender}` : '';
    return {
      prioritas: PRIORITY.URGENT,
      alasanPrioritas: `Diminta segera${who} via WhatsApp${quote ? `: "${quote}"` : '.'}`,
    };
  }

  if (HIGH_RE.test(text)) {
    return { prioritas: PRIORITY.HIGH, alasanPrioritas: '' };
  }

  return { prioritas: PRIORITY.NORMAL, alasanPrioritas: '' };
}

function buildDescription(messages) {
  const body = messages
    .map(({ text }) => text.replace(URL_RE, '').trim())
    .flatMap((text) => text.split('\n'))
    .map((line) => line.trim())
    .filter((line) => line && !GREETING_RE.test(line) && !THANKS_RE.test(line));

  return body.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Mengubah tanggal WA (12/11/26 atau 12/11/2026, format hari/bulan) menjadi YYYY-MM-DD. */
function toIsoDate(value) {
  const parts = String(value ?? '').split(/[/.-]/).map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return '';

  let [day, month, year] = parts;
  if (year < 100) year += 2000;
  if (month > 12 && day <= 12) [day, month] = [month, day];
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Menganalisis chat WA dan mengembalikan usulan isi form.
 * @param {string} raw teks yang ditempel
 * @param {{ requester?: string }} options pilih pengirim tertentu sebagai requester
 */
export function parseWhatsAppRequest(raw, options = {}) {
  const messages = splitMessages(raw);
  const senders = listSenders(messages);

  if (messages.length === 0) {
    return { ok: false, error: 'Teks kosong atau tidak berisi pesan.', senders: [] };
  }

  const requester =
    options.requester && senders.some((item) => item.name === options.requester)
      ? options.requester
      : senders[0]?.name ?? '';

  // Jika ada nama pengirim, deskripsi hanya diambil dari pesan requester.
  const own = requester ? messages.filter((message) => message.sender === requester) : messages;
  const ownText = own.map((message) => message.text).join('\n');
  const allText = messages.map((message) => message.text).join('\n');
  const deskripsi = buildDescription(own) || ownText;

  // Kutipan alasan diambil dari deskripsi yang sudah bersih dari salam dan URL.
  const { prioritas, alasanPrioritas } = detectPriority(deskripsi, requester);

  return {
    ok: true,
    senders,
    requester,
    tanggalPesan: toIsoDate(own[0]?.date),
    fields: {
      nama_orang_req: requester,
      divisi: detectDivisi(allText),
      deskripsi,
      prioritas,
      alasanPrioritas,
      links: extractLinks(allText),
    },
  };
}
