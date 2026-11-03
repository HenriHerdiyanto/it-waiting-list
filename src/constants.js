export const STATUS = {
  ON_PROGRESS: 'On Proses',
  WAITING: 'Waiting',
  PENDING: 'Pending',
  DONE: 'Done',
};

export const STATUS_OPTIONS = [STATUS.ON_PROGRESS, STATUS.WAITING, STATUS.PENDING, STATUS.DONE];

// Urutan grup saat sorting: On Proses -> Waiting -> Pending -> Done
export const STATUS_WEIGHT = {
  [STATUS.ON_PROGRESS]: 1,
  [STATUS.WAITING]: 2,
  [STATUS.PENDING]: 3,
  [STATUS.DONE]: 4,
};

export const DIVISI_OPTIONS = ['Rapspoint', 'Vender', 'Barapoint', 'FMI', 'Aoshi', 'Station'];

export const PRIORITY = {
  NORMAL: 'Normal',
  HIGH: 'Tinggi',
  URGENT: 'Urgent',
};

export const PRIORITY_OPTIONS = [PRIORITY.NORMAL, PRIORITY.HIGH, PRIORITY.URGENT];

// Semakin kecil, semakin tinggi prioritasnya.
export const PRIORITY_WEIGHT = {
  [PRIORITY.URGENT]: 1,
  [PRIORITY.HIGH]: 2,
  [PRIORITY.NORMAL]: 3,
};

export const SHIFT_POLICY = {
  SHIFT: 'geser',
  PARALLEL: 'paralel',
};

export const SHIFT_POLICY_OPTIONS = [
  { value: SHIFT_POLICY.SHIFT, label: 'Geser proyek yang bentrok' },
  { value: SHIFT_POLICY.PARALLEL, label: 'Jadwalkan paralel (tidak menggeser)' },
];

export const SHIFT_SCOPE = {
  ALL: 'semua',
  DIVISI: 'divisi',
  PIC: 'pic',
};

export const SHIFT_SCOPE_OPTIONS = [
  { value: SHIFT_SCOPE.ALL, label: 'Semua proyek yang bentrok' },
  { value: SHIFT_SCOPE.DIVISI, label: 'Hanya divisi yang sama' },
  { value: SHIFT_SCOPE.PIC, label: 'Hanya PIC yang sama' },
];

export const SCHEDULE_STATUS = {
  UNSCHEDULED: 'Belum Dijadwalkan',
  SCHEDULED: 'Terjadwal',
  RUNNING: 'Berjalan',
  OVERDUE: 'Terlambat',
  DONE: 'Selesai',
};

export const SCHEDULE_STATUS_OPTIONS = [
  SCHEDULE_STATUS.UNSCHEDULED,
  SCHEDULE_STATUS.SCHEDULED,
  SCHEDULE_STATUS.RUNNING,
  SCHEDULE_STATUS.OVERDUE,
  SCHEDULE_STATUS.DONE,
];

export const SHIFTED_FILTER = 'Tergeser';

export const MAX_HISTORY = 20;
export const SHIFT_WARNING_PROJECTS = 10;
export const SHIFT_WARNING_DAYS = 30;

export const TAB_ACTIVE = 'active';
export const TAB_PENDING = 'pending';
export const TAB_DONE = 'done';

// Tab tujuan setelah request disimpan/diedit, berdasarkan statusnya.
export const TAB_BY_STATUS = {
  [STATUS.ON_PROGRESS]: TAB_ACTIVE,
  [STATUS.WAITING]: TAB_ACTIVE,
  [STATUS.PENDING]: TAB_PENDING,
  [STATUS.DONE]: TAB_DONE,
};

export const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50];

export const EMPTY_FORM = {
  nama_orang_req: '',
  divisi: [],
  deskripsi: '',
  PIC: '',
  status: STATUS.WAITING,
  is_priority: false,
  prioritas: PRIORITY.NORMAL,
  alasanPrioritas: '',
  kebijakanGeser: SHIFT_POLICY.SHIFT,
  lingkupGeser: SHIFT_SCOPE.ALL,
  jadwalTerkunci: false,
  mulai: '',
  durasiHari: 1,
  estimasiSelesai: '',
  roadmap: [],
};
