import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: Masukkan SUPABASE_URL dan SUPABASE_KEY di environment variable atau .env sebelum menjalankan migrasi.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrate() {
  const dbPath = path.join(ROOT_DIR, 'db.json');
  let dbData = { requests: [], pics: [] };

  try {
    dbData = JSON.parse(readFileSync(dbPath, 'utf8'));
  } catch (e) {
    console.error('Gagal membaca db.json:', e.message);
    process.exit(1);
  }

  console.log('Memulai migrasi data dari db.json ke Supabase...');

  if (Array.isArray(dbData.requests) && dbData.requests.length > 0) {
    // Bersihkan field ID jika berupa integer bertipe string atau generate ID baru jika tidak valid UUID
    const requestsToInsert = dbData.requests.map((item) => {
      const copy = { ...item };
      // jika id bukan format UUID v4, biarkan Supabase membuatkan UUID baru
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(copy.id));
      if (!isUuid) {
        delete copy.id;
      }
      return copy;
    });

    const { data, error } = await supabase.from('requests').insert(requestsToInsert).select();
    if (error) {
      console.error('Gagal migrasi requests:', error.message);
    } else {
      console.log(`Berhasil mengimpor ${data.length} item request ke Supabase.`);
    }
  }

  if (Array.isArray(dbData.pics) && dbData.pics.length > 0) {
    const picsToInsert = dbData.pics.map((item) => {
      const copy = { ...item };
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(copy.id));
      if (!isUuid) {
        delete copy.id;
      }
      return copy;
    });

    const { data, error } = await supabase.from('pics').insert(picsToInsert).select();
    if (error) {
      console.error('Gagal migrasi pics:', error.message);
    } else {
      console.log(`Berhasil mengimpor ${data.length} item PIC ke Supabase.`);
    }
  }

  console.log('Migrasi selesai!');
}

migrate();
