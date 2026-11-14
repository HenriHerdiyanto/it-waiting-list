-- Bucket Supabase Storage untuk lampiran IT Waiting List.
-- Jalankan sekali di Supabase Dashboard -> SQL Editor -> New query -> Run.

-- 1. Bucket publik "attachments": maks 10 MB per file, hanya gambar, PDF, dan Word.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  true,
  10000000,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- 2. Siapa pun boleh membaca file di bucket ini (sama seperti halaman publik aplikasi).
drop policy if exists "attachments_public_read" on storage.objects;
create policy "attachments_public_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'attachments');

-- 3. Aplikasi (memakai anon key) boleh mengunggah file baru ke bucket ini.
--    Tidak ada izin update/delete, jadi file yang sudah ada tidak bisa ditimpa atau dihapus dari browser.
drop policy if exists "attachments_anon_upload" on storage.objects;
create policy "attachments_anon_upload"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'attachments');
