# IT Request Waiting List

Aplikasi web untuk mencatat, memantau, dan mengurutkan request/perbaikan IT dari tiap divisi.

## Fitur

- **Tab Aktif, Pending & Selesai** — `On Proses`/`Waiting` di tab Aktif, `Pending` di tab sendiri, dan `Done` diarsipkan di tab Selesai.
- **Urutan manual** — tombol 🔼 Naik / 🔽 Turun dan drag & drop untuk menggeser request, tersimpan permanen ke API.
- **Prioritas VIP** — request VIP selalu tampil paling atas.
- **Multi-divisi** — satu request bisa berasal dari beberapa divisi sekaligus (pilih lewat chip).
- **Pencarian & filter** — cari nama/deskripsi/PIC/divisi, filter divisi dan status.
- **Pagination** — pilih 10/25/50 baris per halaman.
- **Export CSV** — unduh data sesuai tab dan filter yang sedang aktif.
- **Panel admin** — tambah, edit, hapus, ubah prioritas, dan buka kembali request yang sudah selesai.
- **Notifikasi toast, loading skeleton, dan error state** dengan tombol coba lagi.

## Status & Tab

| Tab | Status yang tampil |
| --- | --- |
| Aktif | `On Proses`, `Waiting` |
| Pending | `Pending` |
| Selesai | `Done` (arsip) |

Request `Pending` **tidak** muncul di tab Aktif. Tab Selesai satu-satunya yang menampilkan kolom tanggal selesai dan tombol **Buka Kembali** (mengembalikan request ke `Waiting`).

## Aturan Urutan

Urutan daftar ditentukan berlapis:

1. **VIP** selalu di atas.
2. **Status**: `On Proses` → `Waiting` → `Pending` → `Done`.
3. **Urutan manual** (`urutan`, unik 1..N).
4. `createdAt` lalu `id` sebagai tie-breaker agar urutan selalu stabil.

Tombol Naik/Turun dan drag & drop hanya menggeser request **di dalam grup prioritas + status yang sama**. Saat pencarian/filter aktif, pengurutan dinonaktifkan agar hasil filter tidak membingungkan. Saat data dimuat, `urutan` yang duplikat/hilang otomatis dinormalisasi dan disimpan ulang.

## Data Divisi

`divisi` disimpan sebagai array, misalnya `["Aoshi", "FMI"]`. Data lama yang masih berupa string (`"Aoshi"` atau `"Aoshi, FMI"`) otomatis dimigrasikan sekali saat aplikasi dimuat. Divisi kosong ditampilkan sebagai **Management**.

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
├─ App.jsx              # Orkestrasi state, tab, dan aksi
├─ api.js               # Wrapper fetch + CRUD + simpan urutan
├─ config.js            # API URL & kredensial dari env
├─ constants.js         # Status, divisi, tab, konstanta form
├─ hooks/
│  └─ useToast.js
├─ utils/
│  ├─ order.js          # Sorting, normalisasi urutan, filter, perpindahan
│  └─ format.js         # Format tanggal & export CSV
├─ components/
│  ├─ Header.jsx
│  ├─ LoginForm.jsx
│  ├─ RequestForm.jsx
│  ├─ DivisiPicker.jsx
│  ├─ Tabs.jsx
│  ├─ FilterPanel.jsx
│  ├─ RequestTable.jsx
│  ├─ Pagination.jsx
│  ├─ ConfirmDialog.jsx
│  ├─ ToastContainer.jsx
│  └─ Feedback.jsx
├─ App.css
└─ index.css
```

## Catatan Keamanan

Login admin saat ini hanya pembatas UI: kredensial dibaca dari env dan status login disimpan di `localStorage`. Ini **bukan autentikasi yang aman** karena kode frontend dapat dibaca siapa pun. Untuk penggunaan produksi, gunakan autentikasi di sisi server/backend.
