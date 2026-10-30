const CSV_HEADERS = [
  'No',
  'Nama',
  'Divisi',
  'Deskripsi',
  'PIC',
  'Status',
  'Prioritas',
  'Urutan',
  'Selesai Pada',
];

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function requestsToCsv(items, offset = 0) {
  const rows = items.map((item, index) => [
    offset + index + 1,
    item.nama_orang_req,
    item.divisi.length > 0 ? item.divisi.join('; ') : 'Management',
    item.deskripsi,
    item.PIC,
    item.status,
    item.is_priority ? 'VIP' : 'Normal',
    item.urutan ?? '',
    item.doneAt ?? '',
  ]);

  return [CSV_HEADERS, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function downloadCsv(filename, content) {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDateTime(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
