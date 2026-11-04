import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  createRequest,
  deleteRequest,
  fetchRequests,
  saveBatch,
  updateRequest,
} from '../api';
import { PRIORITY, SHIFT_POLICY, STATUS } from '../constants';
import {
  normalizeRequest,
  prepareRequests,
  reindexRequests,
  sortRequests,
} from '../utils/order';
import { buildNotePlan, findOverlapCandidates } from '../utils/schedule';
import { syncRoadmapDates } from '../utils/roadmap';
import {
  hasPic,
  normalizePicNames,
  replacePicName,
} from '../utils/pic';
import {
  addPic,
  editPic,
  loadPicStore,
  removePic,
  sortPics,
} from '../services/picStore';
import { useToastContext } from './ToastContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { notify } = useToastContext();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [pics, setPics] = useState([]);
  const [picMode, setPicMode] = useState('local');
  const [picError, setPicError] = useState('');
  const [picLoading, setPicLoading] = useState(true);
  const [picBusy, setPicBusy] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const raw = await fetchRequests();
      const { ordered, changed } = prepareRequests(Array.isArray(raw) ? raw : []);
      setRequests(ordered);

      // Sembuhkan urutan dan migrasi field baru sekali saja, lalu simpan permanen.
      if (changed.length > 0) {
        try {
          await saveBatch(changed);
        } catch (error) {
          notify(
            `Data termuat, tetapi gagal menyimpan pembaruan data: ${error.message}`,
            'warning',
          );
        }
      }
    } catch (error) {
      setLoadError(error.message || 'Gagal memuat data request.');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    // Memuat data adalah sinkronisasi dengan API eksternal; setState terjadi setelah await.
    // oxlint-disable-next-line react/set-state-in-effect
    loadData();
  }, [loadData]);

  useEffect(() => {
    let active = true;

    async function loadPics() {
      const result = await loadPicStore();
      if (!active) return;
      setPics(sortPics(result.pics));
      setPicMode(result.mode);
      setPicError(result.error);
      setPicLoading(false);
    }

    // Sinkronisasi master PIC dengan API/localStorage setelah await.
    // oxlint-disable-next-line react/set-state-in-effect
    loadPics();

    return () => {
      active = false;
    };
  }, []);

  const retryLoad = useCallback(() => {
    setLoadError('');
    setLoading(true);
    loadData();
  }, [loadData]);

  const persistRequest = useCallback(
    async ({
      payload,
      existing,
      editId,
      note = null,
      message = '',
    }) => {
      setSaving(true);

      try {
        let saved;

        if (editId) {
          saved = normalizeRequest(await updateRequest(editId, payload), 0);
        } else {
          const maxUrutan = requests.reduce(
            (max, item) => Math.max(max, Number(item.urutan) || 0),
            0,
          );
          saved = normalizeRequest(
            await createRequest({ ...payload, urutan: maxUrutan + 1 }),
            0,
          );
        }

        let notedUpdates = [];
        let noteError = null;

        if (note && Array.isArray(note.selectedIds) && note.selectedIds.length > 0) {
          const plan = buildNotePlan(requests, saved, {
            selectedIds: note.selectedIds,
          });
          notedUpdates = plan.items.map((entry) => entry.updated);

          try {
            await saveBatch(notedUpdates);
          } catch (error) {
            noteError = error;
          }
        }

        const appliedUpdates = noteError ? [] : notedUpdates;
        const updatedById = new Map(
          appliedUpdates.map((item) => [String(item.id), item]),
        );

        let nextList = editId
          ? requests.map((item) =>
              String(item.id) === String(editId)
                ? { ...saved, urutan: existing?.urutan ?? item.urutan }
                : item,
            )
          : [...requests, saved];

        nextList = nextList.map((item) => updatedById.get(String(item.id)) ?? item);
        nextList = sortRequests(nextList);
        setRequests(nextList);

        if (noteError) {
          notify(
            `Request tersimpan, tetapi keterangan bentrok gagal disimpan: ${noteError.message}`,
            'warning',
          );
        } else {
          notify(
            message ||
              (editId
                ? 'Request berhasil diperbarui.'
                : 'Request baru berhasil ditambahkan.'),
          );
        }

        return true;
      } catch (error) {
        notify(error.message || 'Gagal menyimpan request.', 'error');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [notify, requests],
  );

  /**
   * Menyimpan request. Jika request Urgent bentrok dengan proyek lain,
   * kembalikan `preview` agar halaman menampilkan dialog konfirmasi.
   */
  const submitRequest = useCallback(
    async ({ payload, existing = null, targetTab, message = '' }) => {
      const canShift =
        payload.prioritas === PRIORITY.URGENT &&
        payload.kebijakanGeser === SHIFT_POLICY.SHIFT &&
        payload.mulai &&
        payload.estimasiSelesai;

      if (canShift) {
        const urgentPreview = {
          ...payload,
          id: existing?.id ?? 'preview',
        };
        const candidates = findOverlapCandidates(requests, urgentPreview, {
          scope: payload.lingkupGeser,
        });

        if (candidates.length > 0) {
          return {
            preview: {
              token: Date.now(),
              payload,
              existing,
              editId: existing?.id ?? null,
              targetTab,
              urgent: urgentPreview,
              candidates,
              defaultSelectedIds: candidates
                .filter(
                  (item) =>
                    !item.jadwalTerkunci && item.prioritas !== PRIORITY.URGENT,
                )
                .map((item) => item.id),
            },
          };
        }
      }

      const saved = await persistRequest({
        payload,
        existing,
        editId: existing?.id ?? null,
        targetTab,
        message,
      });

      return { saved };
    },
    [persistRequest, requests],
  );

  const completeShift = useCallback(
    async (preview, selectedIds) => {
      if (!preview) return false;

      return persistRequest({
        payload: preview.payload,
        existing: preview.existing,
        editId: preview.editId,
        note: { selectedIds },
        message:
          'Request prioritas tersimpan dan keterangan ditambahkan ke proyek yang bentrok.',
      });
    },
    [persistRequest],
  );

  const removeRequest = useCallback(
    async (target) => {
      if (!target) return false;

      setBusyId(target.id);

      try {
        await deleteRequest(target.id);

        const remaining = requests.filter(
          (item) => String(item.id) !== String(target.id),
        );
        const { ordered, changed } = reindexRequests(remaining);
        setRequests(ordered);

        if (changed.length > 0) {
          try {
            await saveBatch(changed);
          } catch {
            // Urutan di UI tetap rapi; akan diselaraskan lagi saat data dimuat ulang.
          }
        }

        notify('Request berhasil dihapus.');
        return true;
      } catch (error) {
        notify(error.message || 'Gagal menghapus request.', 'error');
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [notify, requests],
  );

  const applyOrder = useCallback(
    async (result) => {
      const previous = requests;
      setBusyId(result.movedId);
      setRequests(result.ordered);

      try {
        await saveBatch(result.changed);
        return true;
      } catch (error) {
        setRequests(previous);
        notify(error.message || 'Gagal menyimpan urutan.', 'error');
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [notify, requests],
  );

  const reopenRequest = useCallback(
    async (req) => {
      const previous = requests;
      setBusyId(req.id);

      try {
        const saved = normalizeRequest(
          await updateRequest(req.id, {
            ...req,
            status: STATUS.WAITING,
            doneAt: null,
            updatedAt: new Date().toISOString(),
          }),
          0,
        );

        setRequests((current) =>
          sortRequests(
            current.map((item) =>
              String(item.id) === String(req.id)
                ? { ...saved, urutan: req.urutan }
                : item,
            ),
          ),
        );

        notify('Request dibuka kembali dan masuk ke daftar aktif.');
        return true;
      } catch (error) {
        setRequests(previous);
        notify(error.message || 'Gagal membuka kembali request.', 'error');
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [notify, requests],
  );

  const reviseRequest = useCallback(
    async (req, deskripsiRevisi) => {
      const previous = requests;
      setBusyId(req.id);

      try {
        const saved = normalizeRequest(
          await updateRequest(req.id, {
            ...req,
            status: STATUS.REVISI,
            deskripsiRevisi,
            doneAt: req.doneAt ?? null,
            updatedAt: new Date().toISOString(),
          }),
          0,
        );

        setRequests((current) =>
          sortRequests(
            current.map((item) =>
              String(item.id) === String(req.id)
                ? { ...saved, urutan: req.urutan }
                : item,
            ),
          ),
        );

        notify('Request dipindahkan ke tab Revisi.');
        return true;
      } catch (error) {
        setRequests(previous);
        notify(error.message || 'Gagal mengubah status ke Revisi.', 'error');
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [notify, requests],
  );

  const toggleRoadmapStep = useCallback(
    async (req, step) => {
      if (busyId) return;

      const nextRoadmap = req.roadmap.map((item) =>
        item.id === step.id
          ? { ...item, status: item.status === 'done' ? 'todo' : 'done' }
          : item,
      );

      const payload = {
        ...req,
        roadmap: syncRoadmapDates(nextRoadmap, req.mulai),
        updatedAt: new Date().toISOString(),
      };

      setBusyId(req.id);

      try {
        const saved = normalizeRequest(await updateRequest(req.id, payload), 0);
        setRequests((current) =>
          sortRequests(
            current.map((item) =>
              String(item.id) === String(req.id)
                ? { ...saved, urutan: req.urutan }
                : item,
            ),
          ),
        );
        return true;
      } catch (error) {
        notify(error.message || 'Gagal memperbarui langkah roadmap.', 'error');
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [busyId, notify],
  );

  /* ------------------------------- Master PIC ------------------------------ */

  const createPicEntry = useCallback(
    async (payload) => {
      setPicBusy(true);

      try {
        const item = await addPic(payload, picMode);
        setPics((current) => sortPics([...current, item]));
        notify('PIC baru berhasil ditambahkan.');
        return item;
      } catch (error) {
        notify(error.message || 'Gagal menambahkan PIC.', 'error');
        return null;
      } finally {
        setPicBusy(false);
      }
    },
    [notify, picMode],
  );

  const updatePicEntry = useCallback(
    async (id, payload) => {
      setPicBusy(true);

      try {
        const currentPic = pics.find((item) => String(item.id) === String(id));
        const item = await editPic(id, payload, picMode);
        setPics((current) =>
          sortPics(
            current.map((entry) =>
              String(entry.id) === String(id) ? item : entry,
            ),
          ),
        );

        // Ganti nama PIC otomatis menyelaraskan request yang memakainya.
        const oldName = String(currentPic?.nama ?? '').trim();
        const newName = item.nama;
        const affected =
          oldName && newName && oldName !== newName
            ? requests.filter((request) => hasPic(request.PIC, oldName))
            : [];

        let syncWarning = '';

        if (affected.length > 0) {
          const now = new Date().toISOString();
          const updated = affected.map((request) => ({
            ...request,
            PIC: replacePicName(request.PIC, oldName, newName),
            updatedAt: now,
          }));

          try {
            await saveBatch(updated);
            const byId = new Map(updated.map((entry) => [String(entry.id), entry]));
            setRequests((current) =>
              sortRequests(
                current.map((entry) => byId.get(String(entry.id)) ?? entry),
              ),
            );
          } catch (error) {
            syncWarning = `Nama PIC diperbarui, tetapi ${affected.length} request gagal diselaraskan: ${error.message}`;
          }
        }

        if (syncWarning) {
          notify(syncWarning, 'warning');
        } else if (affected.length > 0) {
          notify(
            `PIC diperbarui dan ${affected.length} request ikut diperbarui.`,
          );
        } else {
          notify('PIC berhasil diperbarui.');
        }

        return item;
      } catch (error) {
        notify(error.message || 'Gagal memperbarui PIC.', 'error');
        return null;
      } finally {
        setPicBusy(false);
      }
    },
    [notify, picMode, pics, requests],
  );

  const deletePicEntry = useCallback(
    async (id) => {
      setPicBusy(true);

      try {
        await removePic(id, picMode);
        setPics((current) =>
          current.filter((item) => String(item.id) !== String(id)),
        );
        notify('PIC berhasil dihapus.');
        return true;
      } catch (error) {
        notify(error.message || 'Gagal menghapus PIC.', 'error');
        return false;
      } finally {
        setPicBusy(false);
      }
    },
    [notify, picMode],
  );

  const importPicsFromRequests = useCallback(
    async (role = 'BE') => {
      const existingNames = new Set(
        pics.map((item) => item.nama.trim().toLowerCase()),
      );
      const names = [];
      const seen = new Set(existingNames);

      requests.forEach((request) => {
        normalizePicNames(request.PIC).forEach((nama) => {
          const key = nama.toLowerCase();
          if (seen.has(key)) return;

          seen.add(key);
          names.push(nama);
        });
      });

      if (names.length === 0) {
        notify('Semua PIC dari data request sudah ada di master.', 'info');
        return 0;
      }

      setPicBusy(true);
      const created = [];

      try {
        for (const nama of names) {
          const item = await addPic({ nama, role }, picMode);
          created.push(item);
        }

        setPics((current) => sortPics([...current, ...created]));
        notify(
          `${created.length} PIC berhasil diimpor dari data request. Silakan sesuaikan role-nya.`,
        );
        return created.length;
      } catch (error) {
        notify(error.message || 'Gagal mengimpor PIC dari request.', 'error');
        return created.length;
      } finally {
        setPicBusy(false);
      }
    },
    [notify, picMode, pics, requests],
  );

  const value = useMemo(
    () => ({
      requests,
      loading,
      loadError,
      saving,
      busyId,
      retryLoad,
      submitRequest,
      completeShift,
      removeRequest,
      applyOrder,
      reopenRequest,
      reviseRequest,
      toggleRoadmapStep,
      pics,
      picMode,
      picError,
      picLoading,
      picBusy,
      createPicEntry,
      updatePicEntry,
      deletePicEntry,
      importPicsFromRequests,
    }),
    [
      requests,
      loading,
      loadError,
      saving,
      busyId,
      retryLoad,
      submitRequest,
      completeShift,
      removeRequest,
      applyOrder,
      reopenRequest,
      reviseRequest,
      toggleRoadmapStep,
      pics,
      picMode,
      picError,
      picLoading,
      picBusy,
      createPicEntry,
      updatePicEntry,
      deletePicEntry,
      importPicsFromRequests,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData harus dipakai di dalam DataProvider.');
  return context;
}
