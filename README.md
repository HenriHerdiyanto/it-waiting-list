# IT Request Waiting List

Aplikasi web untuk mencatat, memantau, menjadwalkan, dan mengurutkan request/perbaikan IT dari tiap divisi.

## Fitur Utama

- **Tab Aktif, Pending & Selesai** — `On Proses`/`Waiting` di tab Aktif, `Pending` di tab sendiri, dan `Done` diarsipkan di tab Selesai.
- **Timeline per request** — cukup isi tanggal mulai dan durasi hari (kalender); estimasi selesai dihitung otomatis (hanya-baca), plus realisasi mulai dan tanggal selesai.
- **Roadmap per request** — generate otomatis per hari atau susun langkah custom dengan durasi berbeda; total durasi ikut menyesuaikan saat durasi request berubah.
- **Prioritas berjenjang** — `Normal`, `Tinggi`, dan `Urgent`.
- **Pergeseran jadwal otomatis** — request `Urgent` dapat menggeser proyek lain yang bentrok, dengan preview dampak, centang per proyek, dan alasan.
- **Pemulihan jadwal** — saat request Urgent selesai/dihapus, proyek yang pernah tergeser ditawarkan untuk dipulihkan.
- **Riwayat jadwal** — audit trail siapa menggeser, kapan, dari/tanggal berapa, dan alasannya.
- **Kesehatan jadwal** — badge `Terjadwal`, `Berjalan`, `Terlambat`, `Tergeser`, dan `Selesai`.
- **Detail drawer** — klik baris request (tanpa perlu login) untuk melihat timeline, agenda kegiatan per tanggal, status langkah, dan riwayat pergeseran dalam satu panel.
- **Filter lengkap** — divisi, status, prioritas, kesehatan jadwal, rentang tanggal, dan hanya yang tergeser.
- **Urutan manual** — tombol Naik/Turun dan drag & drop, tersimpan permanen ke API.
- **Multi-divisi** — satu request bisa berasal dari beberapa divisi sekaligus.
- **Pencarian** — nama, deskripsi, PIC, divisi, alasan prioritas/tergeser, dan judul roadmap.
- **Export CSV** — seluruh kolom jadwal, progres, dan alasan pergeseran.
- **Panel admin** — tambah, edit, hapus, ubah prioritas, atur roadmap, dan buka kembali request selesai.
- **Notifikasi toast, loading skeleton, dan error state**.

## Status & Tab

| Tab | Status yang tampil |
| --- | --- |
| Aktif | `On Proses`, `Waiting` |
| Pending | `Pending` |
| Selesai | `Done` (arsip) |

Request `Pending` **tidak** muncul di tab Aktif. Tab Selesai menampilkan tanggal selesai dan tombol **Buka Kembali** (mengembalikan request ke `Waiting`).

## Prioritas

| Level | Pengaruh |
| --- | --- |
| `Normal` | Urutan biasa |
| `Tinggi` | Naik di atas Normal, tidak menggeser jadwal |
| `Urgent` | Paling atas dan boleh menggeser jadwal proyek lain yang bentrok |

Request `Urgent` wajib memiliki **alasan prioritas**. Saat disimpan dan ada proyek yang bentrok, aplikasi menampilkan **preview dampak** sebelum menyimpan.

## Aturan Pergeseran Jadwal

1. Request `Urgent` dengan kebijakan **Geser proyek yang bentrok** akan mencari semua request aktif (bukan `Done`) yang rentang tanggalnya bentrok.
2. Lingkup pergeseran default adalah **semua proyek yang bentrok**, dan bisa diubah menjadi hanya divisi sama atau PIC sama.
3. Proyek yang dikunci (`jadwalTerkunci`) tidak bisa digeser.
4. Proyek `Urgent` lain tidak dicentang otomatis agar tidak terjadi perang prioritas.
5. Proyek terpilih digeser berurutan mulai dari hari setelah request Urgent selesai, sehingga tidak saling menimpa.
6. Roadmap tiap proyek ikut bergeser.
7. `jadwalAsli` disimpan saat pertama kali tergeser, lalu `jumlahTergeser` dan `riwayatJadwal` diperbarui.
8. Jika dampak lebih dari 10 proyek atau 30 hari, muncul peringatan tambahan.

Saat request Urgent selesai atau dihapus, aplikasi menawarkan pemulihan ke jadwal asli. Jika slot aslinya sudah terpakai, proyek dipindah ke slot terdekat.

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
2. Status: `On Proses` → `Waiting` → `Pending` → `Done`.
3. Urutan manual (`urutan`, unik 1..N).
4. `createdAt` lalu `id` sebagai tie-breaker.

Tombol Naik/Turun dan drag & drop hanya menggeser request **di dalam grup prioritas + status yang sama**. Saat pencarian/filter aktif, pengurutan dinonaktifkan.

## Skema Data Request

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `id` | number/string | ID dari API |
| `nama_orang_req` | string | Nama requester |
| `divisi` | string[] | Bisa lebih dari satu |
| `deskripsi` | string | Deskripsi masalah |
| `PIC` | string | Penanggung jawab |
| `status` | enum | `On Proses`, `Waiting`, `Pending`, `Done` |
| `prioritas` | enum | `Normal`, `Tinggi`, `Urgent` |
| `is_priority` | boolean | Kompatibilitas data lama; true jika prioritas bukan Normal |
| `alasanPrioritas` | string | Wajib untuk Urgent |
| `kebijakanGeser` | enum | `geser` atau `paralel` |
| `lingkupGeser` | enum | `semua`, `divisi`, atau `pic` |
| `jadwalTerkunci` | boolean | Jika true, tidak boleh digeser otomatis |
| `mulai` | `YYYY-MM-DD` | Rencana tanggal mulai |
| `durasiHari` | number | Durasi dalam hari kalender |
| `estimasiSelesai` | `YYYY-MM-DD` | Dihitung dari mulai + durasi |
| `actualStart` | ISO datetime | Otomatis saat status On Proses |
| `tergeserOleh` | id/null | Request prioritas yang menggeser |
| `alasanTergeser` | string/null | Alasan proyek ini tergeser |
| `jadwalAsli` | object/null | `{ mulai, estimasiSelesai }` sebelum tergeser |
| `jumlahTergeser` | number | Berapa kali jadwal bergeser |
| `riwayatJadwal` | array | Audit trail perubahan jadwal |
| `roadmap` | array | Langkah kerja |
| `urutan` | number | Urutan manual |
| `createdAt` | ISO datetime | Waktu dibuat |
| `updatedAt` | ISO datetime | Waktu terakhir diubah |
| `doneAt` | ISO datetime/null | Waktu selesai |

Data lama dimigrasikan otomatis saat aplikasi dimuat: `is_priority: true` menjadi `prioritas: "Urgent"`, divisi string menjadi array, dan field jadwal baru diberi nilai default. Karena `estimasiSelesai` selalu dihitung ulang dari `mulai + durasi`, jadwal lama yang sebelumnya melompati akhir pekan ikut disesuaikan otomatis.

## Perhitungan Tanggal

Semua hari dihitung sebagai hari kalender, termasuk Sabtu, Minggu, dan hari libur nasional. Aplikasi tidak melakukan pengecekan hari libur; pekerjaan di luar hari kerja diatur manual (misalnya lewat lembur). Durasi `1` hari berarti mulai dan selesai pada tanggal yang sama.

## Menjalankan

```bash
npm install
npm run dev
```

Buka alamat yang ditampilkan Vite (biasanya `http://localhost:5173`).

Login admin default:

- Username: `admin`
- Password: `admin123`

## Konfigurasi

Salin `.env.example` menjadi `.env`, lalu sesuaikan:

```env
VITE_API_URL=https://6ae305fe933120ae20f80e32.mockapi.io/requests
VITE_ADMIN_USER=admin
VITE_ADMIN_PASS=admin123
```

Ingin memakai json-server lokal? Jalankan `npm run server` (port `3001`), lalu set:

```env
VITE_API_URL=http://localhost:3001/requests
```

## Script

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan development server Vite |
| `npm run build` | Build produksi ke folder `dist` |
| `npm run preview` | Melihat hasil build |
| `npm run lint` | Menjalankan `oxlint` |
| `npm run server` | Menjalankan json-server dengan `db.json` |

## Struktur Proyek

```
src/
├─ App.jsx                    # Orkestrasi state, tab, aksi, preview geser
├─ api.js                     # Wrapper fetch + CRUD + batch save
├─ config.js                  # API URL & kredensial dari env
├─ constants.js               # Status, prioritas, divisi
├─ hooks/
│  └─ useToast.js
├─ utils/
│  ├─ date.js                 # Utilitas tanggal kalender & overlap
│  ├─ schedule.js             # Kesehatan jadwal, rencana geser & pemulihan
│  ├─ roadmap.js              # Generate, sinkronisasi, validasi roadmap
│  ├─ order.js                # Normalisasi, sorting, filter, perpindahan
│  └─ format.js               # Format tanggal & export CSV
├─ components/
│  ├─ Header.jsx
│  ├─ LoginForm.jsx
│  ├─ RequestForm.jsx
│  ├─ RoadmapEditor.jsx
│  ├─ DivisiPicker.jsx
│  ├─ Tabs.jsx
│  ├─ FilterPanel.jsx
│  ├─ RequestTable.jsx
│  ├─ RequestDetail.jsx
│  ├─ ShiftImpactDialog.jsx
│  ├─ ScheduleBadge.jsx
│  ├─ Pagination.jsx
│  ├─ ConfirmDialog.jsx
│  ├─ ToastContainer.jsx
│  └─ Feedback.jsx
├─ App.css
└─ index.css
```

## Catatan Keamanan

Login admin saat ini hanya pembatas UI: kredensial dibaca dari env dan status login disimpan di `localStorage`. Ini **bukan autentikasi yang aman** karena kode frontend dapat dibaca siapa pun. Untuk penggunaan produksi, gunakan autentikasi di sisi server/backend.
