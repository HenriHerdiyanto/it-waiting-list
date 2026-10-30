export const STATUS = {
  ON_PROGRESS: 'On Proses',
  WAITING: 'Waiting',
  DONE: 'Done',
};

export const STATUS_OPTIONS = [STATUS.ON_PROGRESS, STATUS.WAITING, STATUS.DONE];

// Urutan grup saat sorting: On Proses -> Waiting -> Done
export const STATUS_WEIGHT = {
  [STATUS.ON_PROGRESS]: 1,
  [STATUS.WAITING]: 2,
  [STATUS.DONE]: 3,
};

export const DIVISI_OPTIONS = ['Rapspoint', 'Vender', 'Barapoint', 'FMI', 'Aoshi', 'Station'];

export const TAB_ACTIVE = 'active';
export const TAB_DONE = 'done';

export const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50];

export const EMPTY_FORM = {
  nama_orang_req: '',
  divisi: '',
  deskripsi: '',
  PIC: '',
  status: STATUS.WAITING,
  is_priority: false,
};
