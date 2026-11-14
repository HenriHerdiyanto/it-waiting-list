import 'dotenv/config';
import crypto from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PORT = Number(process.env.PORT) || 3002;
const UPLOAD_DIR = path.resolve(ROOT_DIR, process.env.UPLOAD_DIR || 'uploads');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PUBLIC_UPLOAD_URL = String(process.env.PUBLIC_UPLOAD_URL || '').replace(/\/+$/, '');
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const MAX_UPLOAD_MB = Math.max(1, Number(process.env.MAX_UPLOAD_MB) || 10);
const MAX_FILE_SIZE = MAX_UPLOAD_MB * 1000 * 1000;
const MAX_FILES = Math.max(1, Number(process.env.MAX_UPLOAD_FILES) || 5);

const ALLOWED_TYPES = new Map([
  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/png', ['.png']],
  ['image/webp', ['.webp']],
  ['image/gif', ['.gif']],
  ['application/pdf', ['.pdf']],
  ['application/msword', ['.doc']],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', ['.docx']],
]);

mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, UPLOAD_DIR),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter: (_req, file, callback) => {
    const extensions = ALLOWED_TYPES.get(file.mimetype);
    const extension = path.extname(file.originalname || '').toLowerCase();

    if (!extensions || !extensions.includes(extension)) {
      callback(
        new Error('Tipe file tidak didukung. Gunakan gambar JPG/PNG/WEBP/GIF, PDF, atau Word (DOC/DOCX).'),
      );
      return;
    }

    callback(null, true);
  },
});

async function removeFiles(files) {
  if (!Array.isArray(files)) return;

  await Promise.all(
    files.map((file) =>
      unlink(file.path).catch(() => {
        // File mungkin belum sempat tersimpan; abaikan kegagalan pembersihan.
      }),
    ),
  );
}

function uploadErrorMessage(error) {
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return `Ukuran file maksimal ${MAX_UPLOAD_MB} MB.`;
  }

  if (error?.code === 'LIMIT_FILE_COUNT') {
    return `Maksimal ${MAX_FILES} file sekali upload.`;
  }

  if (error?.code === 'LIMIT_UNEXPECTED_FILE') {
    return 'Jumlah file melebihi batas upload.';
  }

  return error?.message || 'Upload file gagal.';
}

const app = express();

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, maxFileSizeMb: MAX_UPLOAD_MB, maxFiles: MAX_FILES });
});

app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    index: false,
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  }),
);
app.use('/uploads', (_req, res) => {
  res.status(404).json({ message: 'File tidak ditemukan.' });
});

app.post('/api/uploads', (req, res) => {
  upload.array('files', MAX_FILES)(req, res, async (error) => {
    if (error) {
      await removeFiles(req.files);
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      res.status(status).json({ message: uploadErrorMessage(error) });
      return;
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      res.status(400).json({ message: 'Pilih minimal satu file untuk diunggah.' });
      return;
    }

    const uploaded = files.map((file) => ({
      id: file.filename,
      name: file.originalname,
      type: file.mimetype,
      size: file.size,
      url: `${PUBLIC_UPLOAD_URL}/uploads/${encodeURIComponent(file.filename)}`,
    }));

    res.status(201).json(uploaded);
  });
});

app.use(express.static(DIST_DIR, { index: 'index.html' }));

app.use((req, res, next) => {
  if (req.method !== 'GET') {
    next();
    return;
  }

  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    next();
    return;
  }

  const indexFile = path.join(DIST_DIR, 'index.html');
  if (!existsSync(indexFile)) {
    res.status(404).json({
      message: 'Build frontend belum tersedia. Jalankan npm run build terlebih dahulu.',
    });
    return;
  }

  res.sendFile(indexFile);
});

app.use((_req, res) => {
  res.status(404).json({ message: 'Endpoint tidak ditemukan.' });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Terjadi kesalahan pada server upload.' });
});

app.listen(PORT, () => {
  console.log(`Upload server berjalan di http://localhost:${PORT}`);
  console.log(`Folder upload: ${UPLOAD_DIR}`);
  console.log(`Batas file: ${MAX_UPLOAD_MB} MB/file, maksimal ${MAX_FILES} file.`);
});
