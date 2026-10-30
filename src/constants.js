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
};
