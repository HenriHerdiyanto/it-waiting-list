# IT Request Waiting List

Aplikasi web untuk mencatat, memantau, menjadwalkan, dan mengurutkan request/perbaikan IT dari tiap divisi.

## Fitur Utama

- **Tab Aktif, Revisi, Pending & Selesai** — `On Proses`/`Waiting` di tab Aktif, `Revisi` di tab sendiri, `Pending` di tab sendiri, dan `Done` diarsipkan di tab Selesai.
- **Alur revisi** — request `Done` yang masih bermasalah bisa diubah ke `Revisi` lewat dropdown status atau tombol cepat di tab Selesai. Saat masuk `Revisi`, **deskripsi revisi wajib diisi**. Tanggal selesai terakhir tetap tersimpan, sedangkan tanggal dan roadmap tidak diubah otomatis.
- **Deskripsi sesuai status** — selama status `Revisi`, tabel dan detail menampilkan **deskripsi revisi**. Untuk status lain yang tampil adalah deskripsi awal. Deskripsi awal tetap bisa dibuka dari detail request.
- **Link tambahan & lampiran** — deskripsi cukup menjelaskan kebutuhan/pekerjaan. Link Figma, spreadsheet, atau referensi lain disimpan sebagai daftar link berjudul; gambar dan PDF diunggah terpisah sebagai lampiran (maksimal 10 MB per file dan 5 lampiran per request).
- **Timeline per request** — tanggal mulai **opsional** (kosongkan jika jadwal belum ditentukan); jika diisi, cukup lengkapi durasi hari kalender dan estimasi selesai dihitung otomatis (hanya-baca), plus realisasi mulai dan tanggal selesai.
- **Roadmap per request** — generate otomatis per hari atau susun langkah custom dengan durasi berbeda; total durasi ikut menyesuaikan saat durasi request berubah.
- **Prioritas berjenjang** — `Normal`, `Tinggi`, dan `Urgent`.
- **Keterangan bentrok otomatis** — request `Urgent` yang bentrok dengan proyek lain dapat menandai proyek tersebut dengan keterangan `Tergeser oleh ... (Urgent)` lewat preview dan centang per proyek. Tanggal, durasi, dan roadmap proyek yang bentrok **tidak diubah**.
- **Keterangan permanen** — keterangan bentrok tetap tersimpan sebagai riwayat meskipun request Urgent selesai atau dihapus. Tanggal proyek tidak pernah dipulihkan/diubah otomatis.
- **Riwayat jadwal** — audit trail siapa yang menandai bentrok, kapan, dan keterangannya.
- **Kesehatan jadwal** — badge `Belum Dijadwalkan`, `Terjadwal`, `Berjalan`, `Terlambat`, `Tergeser`, dan `Selesai`.
- **Detail drawer** — klik baris request (tanpa perlu login) untuk melihat timeline, agenda kegiatan per tanggal, status langkah, daftar link tambahan, lampiran, dan riwayat keterangan bentrok dalam satu panel.
- **Filter lengkap** — divisi, status, prioritas, kesehatan jadwal, rentang tanggal, dan hanya yang tergeser.
- **Urutan manual** — tombol Naik/Turun dan drag & drop, tersimpan permanen ke API.
- **Multi-divisi** — satu request bisa berasal dari beberapa divisi sekaligus.
- **Pencarian** — nama, deskripsi awal, deskripsi revisi, PIC, divisi, alasan prioritas/keterangan bentrok, judul link, URL, nama lampiran, dan judul roadmap.
- **Export CSV** — seluruh kolom jadwal, progres, keterangan bentrok, deskripsi awal, deskripsi revisi, link tambahan, dan nama/URL lampiran.
- **Panel admin** — tambah, edit, hapus, ubah prioritas, atur roadmap, dan buka kembali request selesai.
- **Dashboard admin** — kartu statistik (Aktif, Revisi, Pending, Selesai, Urgent, Terlambat), daftar "Perlu Perhatian", jadwal terdekat, distribusi divisi, ringkasan PIC per role, dan request terbaru.
- **Master PIC** — CRUD PIC terpisah dengan role `FE`, `BE`, `KADIV`, `DBA`, atau `UI/UX`; form request memakai **checkbox multi-PIC** sehingga satu request bisa ditangani lebih dari satu orang. PIC yang masih dipakai request tidak bisa dihapus, dan mengganti nama PIC otomatis menyelaraskan data request terkait.
- **Halaman terpisah dengan URL asli** — login, dashboard, daftar request, serta form tambah/edit request dan PIC masing-masing punya rute sendiri (bisa di-refresh dan dibagikan tautannya).
- **Halaman publik read-only** — daftar request tetap bisa diakses tanpa login untuk melihat detail, termasuk link tambahan dan lampiran; seluruh aksi pengelolaan hanya muncul setelah login admin.
- **Notifikasi toast, loading skeleton, dan error state**.

## Halaman & Rute

| Rute | Akses | Fungsi |
| --- | --- | --- |
| `/` | Publik | Daftar request read-only, filter, dan detail drawer |
| `/login` | Publik | Login admin |
| `/dashboard` | Admin | Ringkasan statistik dan panel monitoring |
| `/admin/waiting-list` | Admin | Kelola request (tabs, filter, urutan, aksi) |
| `/admin/waiting-list/new` | Admin | Form tambah request |
| `/admin/waiting-list/:id/edit` | Admin | Form edit request |
| `/admin/pic` | Admin | Daftar master PIC |
| `/admin/pic/new` | Admin | Form tambah PIC |
| `/admin/pic/:id/edit` | Admin | Form edit PIC |

Rute admin dijaga oleh `RequireAuth`; pengunjung yang belum login akan diarahkan ke `/login?next=...` lalu dikembalikan ke halaman tujuan setelah berhasil masuk.

## Status & Tab

| Tab | Status yang tampil |
| --- | --- |
| Aktif | `On Proses`, `Waiting` |
| Revisi | `Revisi` |
| Pending | `Pending` |
| Selesai | `Done` (arsip) |

Request `Pending` **tidak** muncul di tab Aktif. Tab Selesai menampilkan tanggal selesai dan tombol **Buka Kembali** (mengembalikan request ke `Waiting`) serta **Revisi** (meminta deskripsi revisi lalu memindahkan ke tab Revisi tanpa mengubah tanggal/roadmap).

Saat status `Revisi`, tabel dan detail menampilkan **deskripsi revisi**. Jika status bukan `Revisi`, yang tampil adalah deskripsi awal. Deskripsi revisi wajib diisi, baik lewat form edit maupun tombol cepat di tab Selesai.

## Prioritas

| Level | Pengaruh |
| --- | --- |
| `Normal` | Urutan biasa |
| `Tinggi` | Naik di atas Normal, tidak memberi keterangan ke jadwal |
| `Urgent` | Paling atas dan boleh menandai proyek lain yang bentrok (tanggal tidak diubah) |

Request `Urgent` wajib memiliki **alasan prioritas**. Saat disimpan dan ada proyek yang bentrok, aplikasi menampilkan **preview keterangan** sebelum menyimpan.

## Aturan Keterangan Bentrok

1. Request `Urgent` dengan kebijakan **Tandai proyek yang bentrok** akan mencari semua request aktif (bukan `Done`) yang rentang tanggalnya bentrok.
2. Lingkup penandaan default adalah **semua proyek yang bentrok**, dan bisa diubah menjadi hanya divisi sama atau PIC sama.
3. Proyek yang dikunci (`jadwalTerkunci`) tidak bisa ditandai otomatis.
4. Proyek `Urgent` lain tidak dicentang otomatis agar tidak terjadi perang prioritas.
5. Proyek terpilih **hanya** diberi field `tergeserOleh`, `alasanTergeser` (`Tergeser oleh {nama} ({prioritas})`), `jumlahTergeser`, dan entri `riwayatJadwal` bertipe `keterangan`.
6. Tanggal `mulai`, `estimasiSelesai`, `durasiHari`, dan `roadmap` proyek yang bentrok **tidak diubah**.
7. Keterangan bersifat permanen; saat request Urgent selesai atau dihapus, tidak ada pemulihan/perubahan tanggal otomatis.
8. Jika request yang sama disimpan ulang dengan bentrok yang sama, keterangan tidak digandakan.

## Roadmap

Setiap request memiliki roadmap berisi langkah-langkah:

| Field | Keterangan |
| --- | --- |
| `judul` | Nama kegiatan (wajib) |
| `deskripsi` | Detail opsional |
| `durasiHari` | Durasi langkah dalam hari |
| `mulai`, `selesai` | Dihitung otomatis |
| `status` | `todo`, `progress` (On Progress), `done`, atau `skipped` |

Tombol **Generate harian** membuat roadmap sesuai durasi request. Langkah bisa diedit, ditambah, dihapus, dan diurutkan. Saat durasi request diubah, total durasi langkah otomatis disesuaikan (langkah terakhir ditambah/dikurangi) agar tidak memicu error. Tombol **Samakan durasi** tetap tersedia untuk penyesuaian manual.

## Urutan Daftar

Urutan ditentukan berlapis:

1. Level prioritas: `Urgent` → `Tinggi` → `Normal`.
2. Status: `On Proses` → `Waiting` → `Revisi` → `Pending` → `Done`.
3. Urutan manual (`urutan`, unik 1..N).
4. `createdAt` lalu `id` sebagai tie-breaker.

Tombol Naik/Turun dan drag & drop hanya menggeser request **di dalam grup prioritas + status yang sama**. Saat pencarian/filter aktif, pengurutan dinonaktifkan.

## Skema Data Request

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `id` | number/string | ID dari API |
| `nama_orang_req` | string | Nama requester |
| `divisi` | string[] | Bisa lebih dari satu |
| `deskripsi` | string | Deskripsi pekerjaan/kebutuhan awal; tidak dipakai untuk menampung link |
| `deskripsiRevisi` | string | Deskripsi kesalahan/perbaikan; wajib saat status `Revisi` dan yang ditampilkan ke user |
| `links` | array | Link tambahan `{ id, label, url }`, misalnya Figma atau spreadsheet |
| `attachments` | array | Lampiran `{ id, name, type, size, url }`; file disimpan di server upload |
| `PIC` | string[] | Daftar penanggung jawab; bisa lebih dari satu |
| `status` | enum | `On Proses`, `Waiting`, `Revisi`, `Pending`, `Done` |
| `prioritas` | enum | `Normal`, `Tinggi`, `Urgent` |
| `is_priority` | boolean | Kompatibilitas data lama; true jika prioritas bukan Normal |
| `alasanPrioritas` | string | Wajib untuk Urgent |
| `kebijakanGeser` | enum | `geser` atau `paralel` |
| `lingkupGeser` | enum | `semua`, `divisi`, atau `pic` |
| `jadwalTerkunci` | boolean | Jika true, tidak diberi keterangan otomatis |
| `mulai` | `YYYY-MM-DD`/null | Rencana tanggal mulai; boleh kosong jika jadwal belum ditentukan |
| `durasiHari` | number | Durasi dalam hari kalender |
| `estimasiSelesai` | `YYYY-MM-DD`/null | Dihitung dari mulai + durasi; null jika tanggal mulai kosong |
| `actualStart` | ISO datetime | Otomatis saat status On Proses |
| `tergeserOleh` | id/null | Request prioritas yang menandai bentrok |
| `alasanTergeser` | string/null | Keterangan `Tergeser oleh {nama} ({prioritas})` |
| `jadwalAsli` | object/null | Data lama `{ mulai, estimasiSelesai }` sebelum pernah tergeser; tidak dipakai untuk penandaan baru |
| `jumlahTergeser` | number | Berapa kali proyek ditandai bentrok |
| `riwayatJadwal` | array | Audit trail penambahan keterangan |
| `roadmap` | array | Langkah kerja |
| `urutan` | number | Urutan manual |
| `createdAt` | ISO datetime | Waktu dibuat |
| `updatedAt` | ISO datetime | Waktu terakhir diubah |
| `doneAt` | ISO datetime/null | Waktu selesai; dipertahankan saat status berubah ke `Revisi`, lalu diperbarui saat selesai lagi |

Data lama dimigrasikan otomatis saat aplikasi dimuat: `is_priority: true` menjadi `prioritas: "Urgent"`, divisi string menjadi array, PIC string menjadi `string[]`, `links`/`attachments` yang belum ada diisi array kosong, dan field jadwal baru diberi nilai default. Karena `estimasiSelesai` selalu dihitung ulang dari `mulai + durasi`, jadwal lama yang sebelumnya melompati akhir pekan ikut disesuaikan otomatis.

## Master PIC

PIC disimpan pada resource terpisah (`pics`) dengan skema minimal:

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `id` | number/string | ID dari API atau ID lokal |
| `nama` | string | Nama unik PIC |
| `role` | enum | `FE` (Frontend), `BE` (Backend), `KADIV` (Kepala Divisi), `DBA` (Database Administrator), atau `UI/UX` (UI/UX Designer) |
| `createdAt` | ISO datetime | Waktu dibuat |
| `updatedAt` | ISO datetime | Waktu terakhir diubah |

Field `PIC` pada request berupa **array nama** agar satu request bisa ditangani beberapa PIC. Form request menampilkan checkbox yang dikelompokkan per role dan tetap mempertahankan nilai PIC lama yang belum terdaftar di master. Data lama yang masih berupa string (termasuk dipisah koma) otomatis dinormalisasi menjadi array saat aplikasi dimuat.

Jika endpoint PIC tidak tersedia (misalnya resource `pics` belum dibuat di MockAPI), aplikasi otomatis beralih ke **mode penyimpanan lokal** memakai `localStorage` (`itwl:pics:v1`). Banner informasi akan muncul di halaman Master PIC, dan tombol **Import dari Request** membantu mengisi master dari nama PIC yang sudah ada.

## Perhitungan Tanggal

Semua hari dihitung sebagai hari kalender, termasuk Sabtu, Minggu, dan hari libur nasional. Aplikasi tidak melakukan pengecekan hari libur; pekerjaan di luar hari kerja diatur manual (misalnya lewat lembur). Durasi `1` hari berarti mulai dan selesai pada tanggal yang sama.

Tanggal mulai boleh dikosongkan untuk status apa pun, misalnya project yang masih `Waiting` dan belum ditentukan kapan dimulai. Request tanpa tanggal mulai ditandai **Belum Dijadwalkan**; tanggal roadmap juga kosong sampai tanggal mulai diisi. Form tambah request baru tidak lagi otomatis mengisi tanggal hari ini.

## Menjalankan

```bash
npm install
npm run dev
```

`npm run dev` menjalankan dua proses sekaligus: frontend Vite dan server upload (`server/index.js`) di port `3002`. Buka alamat yang ditampilkan Vite (biasanya `http://localhost:5173`); permintaan ke `/api` dan `/uploads` diproksikan otomatis ke server upload.

Untuk mode produksi:

```bash
npm run build
npm start
```

`npm start` menyajikan hasil build dari `dist/` sekaligus file lampiran dari `uploads/` di `http://localhost:3002` (atau sesuai `PORT`). Jalankan di host Node yang memiliki penyimpanan disk persisten agar file lampiran tidak hilang saat redeploy. Untuk Vercel, gunakan mode Cloudinary di bawah karena filesystem Vercel tidak persisten.

### Deploy ke Vercel

Vercel hanya menyajikan hasil build frontend (`dist/`). Server Express di `server/index.js` tidak ikut berjalan, jadi upload tidak boleh bergantung pada folder `uploads/` lokal. Gunakan Cloudinary Free agar lampiran tetap bisa diunggah dan dilihat:

1. Buat akun gratis di [Cloudinary](https://cloudinary.com), lalu catat **Cloud name**.
2. Buat **unsigned upload preset** di Settings → Upload → Upload presets dengan allowed formats `jpg,png,webp,gif,pdf`.
3. Aktifkan **Allow delivery of PDF and ZIP files** di Settings → Security agar PDF bisa dibuka di browser.
4. Di Vercel → Settings → Environment Variables, tambahkan:
   ```env
   VITE_UPLOAD_PROVIDER=cloudinary
   VITE_CLOUDINARY_CLOUD_NAME=cloud_name_anda
   VITE_CLOUDINARY_UPLOAD_PRESET=nama_preset_anda
   ```
5. Pastikan **Framework Preset** di Vercel adalah **Vite**, bukan `Other`.
6. Redeploy, karena Vite membaca environment variable saat build.
7. File `vercel.json` sudah menyertakan rewrite SPA agar halaman seperti `/login`, `/dashboard`, dan `/admin/...` tidak 404 saat di-refresh atau dibuka langsung.

Login admin default:

- Username: `admin`
- Password: `admin123`

## Konfigurasi

Salin `.env.example` menjadi `.env`, lalu sesuaikan:

```env
VITE_API_URL=https://6ae305fe933120ae20f80e32.mockapi.io/requests
VITE_PIC_API_URL=
VITE_ADMIN_USER=admin
VITE_ADMIN_PASS=admin123
VITE_UPLOAD_PROVIDER=local
VITE_UPLOAD_URL=/api/uploads
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
PORT=3002
UPLOAD_DIR=./uploads
PUBLIC_UPLOAD_URL=
CORS_ORIGIN=*
MAX_UPLOAD_MB=10
MAX_UPLOAD_FILES=5
```

`VITE_PIC_API_URL` boleh dikosongkan; aplikasi akan menurunkan alamatnya dari `VITE_API_URL` dengan mengganti `/requests` menjadi `/pics`. Isi variabel ini jika master PIC berada di endpoint yang berbeda.

`VITE_UPLOAD_PROVIDER` menentukan tujuan upload: `local` memakai server Express melalui `VITE_UPLOAD_URL`, sedangkan `cloudinary` mengunggah langsung dari browser ke Cloudinary. Jika `VITE_UPLOAD_PROVIDER` tidak diisi tetapi `VITE_CLOUDINARY_CLOUD_NAME` dan `VITE_CLOUDINARY_UPLOAD_PRESET` diisi, aplikasi otomatis memakai mode Cloudinary.

`VITE_UPLOAD_URL` adalah endpoint upload lokal dari sisi frontend. Nilai default `/api/uploads` memakai same-origin sehingga cocok untuk proxy Vite maupun server produksi. Jika frontend dan server upload berada di origin berbeda, isi URL lengkap (misalnya `https://files.contoh.com/api/uploads`) dan sesuaikan `CORS_ORIGIN`. Variabel ini tidak dipakai saat mode Cloudinary aktif.

`VITE_CLOUDINARY_CLOUD_NAME` dan `VITE_CLOUDINARY_UPLOAD_PRESET` adalah kredensial publik Cloudinary untuk unsigned upload. Jangan pernah menaruh API secret Cloudinary di frontend.

Variabel berikut dibaca oleh `server/index.js`:

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `PORT` | `3002` | Port server upload dan server produksi |
| `UPLOAD_DIR` | `./uploads` | Folder penyimpanan file; gunakan path disk persisten di produksi |
| `PUBLIC_UPLOAD_URL` | kosong | Base URL publik file jika berbeda dari origin aplikasi, misalnya `https://files.contoh.com` |
| `CORS_ORIGIN` | `*` | Origin yang diizinkan mengakses endpoint upload |
| `MAX_UPLOAD_MB` | `10` | Batas ukuran per file |
| `MAX_UPLOAD_FILES` | `5` | Batas jumlah file per sekali upload |

Batas di frontend mengikuti 10 MB per file dan 5 lampiran per request. Jika `MAX_UPLOAD_MB`/`MAX_UPLOAD_FILES` di server diubah, sesuaikan juga konstanta di `src/utils/attachments.js` agar pesan validasi tetap konsisten.

Ingin memakai json-server lokal? Jalankan `npm run server` (port `3001`), lalu set:

```env
VITE_API_URL=http://localhost:3001/requests
```

`db.json` sudah menyertakan koleksi `requests` dan `pics`, sehingga mode lokal langsung berjalan untuk keduanya.

## Upload Lampiran

Link tambahan tidak diunggah ke server; hanya URL dan judulnya yang disimpan di field `links`. Sebaliknya, gambar dan PDF disimpan sebagai file fisik:

- **Jenis file**: JPG/JPEG, PNG, WebP, GIF, dan PDF.
- **Batas**: 10 MB per file dan maksimal 5 lampiran per request.
- **Waktu upload**: file baru diunggah saat form disimpan, sehingga membatalkan edit tidak meninggalkan file yatim.
- **Penyimpanan metadata**: hanya metadata lampiran yang disimpan di record request (MockAPI/json-server).

Ada dua mode penyimpanan:

### Mode lokal (default)

- **Endpoint**: `POST /api/uploads` dengan field multipart `files`; respons berisi array `{ id, name, type, size, url }`.
- **Akses file**: `GET /uploads/<nama-file>`; file diberi nama UUID agar tidak bentrok.
- File ditulis ke `UPLOAD_DIR` (default `uploads/`) dan hanya cocok untuk `npm run dev` atau `npm start` di host dengan disk persisten.

### Mode Cloudinary (Vercel)

- Set `VITE_UPLOAD_PROVIDER=cloudinary`, `VITE_CLOUDINARY_CLOUD_NAME`, dan `VITE_CLOUDINARY_UPLOAD_PRESET`.
- Browser mengunggah langsung ke Cloudinary memakai unsigned upload preset; tidak ada file yang ditulis ke disk Vercel.
- URL lampiran yang disimpan berupa URL absolut Cloudinary, sehingga bisa dibuka dari deployment mana pun.
- Aktifkan **Allow delivery of PDF and ZIP files** di Cloudinary agar PDF bisa dibuka di browser.
- Cloudinary Free memiliki kuota bulanan; pantau pemakaian di dashboard Cloudinary.

Menghapus lampiran dari request hanya menghapus referensinya, bukan file fisiknya. File juga tidak ikut terhapus saat request dihapus. Lakukan pembersihan berkala untuk file yang tidak lagi dirujuk oleh request mana pun, dan backup folder `uploads/`/akun Cloudinary secara rutin.

## Script

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan Vite dan server upload sekaligus |
| `npm run dev:web` | Menjalankan Vite saja (tanpa server upload) |
| `npm run upload-server` | Menjalankan server upload saja |
| `npm start` | Server produksi: menyajikan `dist/` dan `/uploads` |
| `npm run build` | Build produksi ke folder `dist` |
| `npm run preview` | Melihat hasil build (tanpa server upload; gunakan `npm start` untuk menguji lampiran) |
| `npm run lint` | Menjalankan `oxlint` pada `src` dan `server` |
| `npm run server` | Menjalankan json-server dengan `db.json` |

## Struktur Proyek

```
vercel.json                   # Build Vercel + rewrite SPA
server/
└─ index.js                   # Upload file lokal, static /uploads, & serve dist (produksi)
uploads/                      # File lampiran mode lokal (tidak di-commit; butuh disk persisten)
src/
├─ App.jsx                    # Router + komposisi provider
├─ api.js                     # Wrapper fetch + CRUD request & PIC + batch save
├─ config.js                  # API URL, URL PIC, & kredensial dari env
├─ constants.js               # Status, prioritas, divisi, role PIC
├─ contexts/
│  ├─ AuthContext.jsx         # Status login admin
│  ├─ DataContext.jsx         # State & aksi request + master PIC
│  └─ ToastContext.jsx        # Notifikasi global
├─ hooks/
│  └─ useToast.js
├─ layouts/
│  └─ DashboardLayout.jsx     # Shell sidebar/topbar admin
├─ routes/
│  └─ RequireAuth.jsx         # Guard rute admin
├─ pages/
│  ├─ PublicListPage.jsx
│  ├─ LoginPage.jsx
│  ├─ DashboardPage.jsx
│  ├─ WaitingListPage.jsx
│  ├─ RequestFormPage.jsx
│  ├─ PicListPage.jsx
│  └─ PicFormPage.jsx
├─ services/
│  ├─ picStore.js             # Master PIC via API + fallback localStorage
│  └─ uploadStore.js          # Upload lampiran ke server lokal / Cloudinary
├─ utils/
│  ├─ date.js                 # Utilitas tanggal kalender & overlap
│  ├─ schedule.js             # Kesehatan jadwal & rencana keterangan bentrok
│  ├─ roadmap.js              # Generate, sinkronisasi, validasi roadmap
│  ├─ order.js                # Normalisasi, sorting, filter, perpindahan
│  ├─ pic.js                  # Normalisasi & operasi multi-PIC
│  ├─ links.js                # Normalisasi, validasi, & label link tambahan
│  ├─ attachments.js          # Batas, validasi, & normalisasi lampiran
│  ├─ requestPayload.js       # Form request <-> payload + validasi
│  └─ format.js               # Format tanggal, ukuran file, & export CSV
├─ components/
│  ├─ Header.jsx
│  ├─ LoginForm.jsx
│  ├─ RequestsExplorer.jsx    # Daftar request bersama (publik & admin)
│  ├─ RequestForm.jsx
│  ├─ LinksEditor.jsx         # Baris link tambahan (judul opsional + URL)
│  ├─ AttachmentEditor.jsx    # Pilih, pratinjau, & hapus lampiran
│  ├─ PicPicker.jsx           # Checkbox multi-PIC per role
│  ├─ RoadmapEditor.jsx
│  ├─ DivisiPicker.jsx
│  ├─ Tabs.jsx
│  ├─ FilterPanel.jsx
│  ├─ RequestTable.jsx
│  ├─ RequestDetail.jsx
│  ├─ RevisionDialog.jsx
│  ├─ ShiftImpactDialog.jsx
│  ├─ ScheduleBadge.jsx
│  ├─ StatCard.jsx
│  ├─ Pagination.jsx
│  ├─ ConfirmDialog.jsx
│  ├─ ToastContainer.jsx
│  └─ Feedback.jsx
├─ App.css
├─ dashboard.css              # Styling dashboard, login, & master PIC
└─ index.css
```

## Catatan Keamanan

Login admin saat ini hanya pembatas UI: kredensial dibaca dari env dan status login disimpan di `localStorage`. Ini **bukan autentikasi yang aman** karena kode frontend dapat dibaca siapa pun. Untuk penggunaan produksi, gunakan autentikasi di sisi server/backend.

Endpoint `POST /api/uploads` dan file di `/uploads` bersifat publik tanpa autentikasi, sama seperti detail request yang memang dapat dilihat tanpa login. Siapa pun yang mengetahui URL file dapat mengaksesnya. Untuk produksi, tambahkan autentikasi/otorisasi upload, rate limit, validasi ulang tipe file di server, serta pertimbangkan pemindaian malware. Jangan mengunggah dokumen sensitif sebelum kontrol keamanan tersebut tersedia.

Pada mode Cloudinary, unsigned upload preset bersifat publik dan namanya terlihat di kode frontend. Batasi **allowed formats** pada preset, validasi ukuran di aplikasi, dan jangan pernah menaruh API secret Cloudinary di frontend. Untuk kontrol lebih ketat, gunakan signed upload melalui backend yang menyimpan API secret.
