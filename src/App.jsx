import { useCallback, useEffect, useState } from 'react';
import './App.css';

import Header from './components/Header';
import LoginForm from './components/LoginForm';
import RequestForm from './components/RequestForm';
import Tabs from './components/Tabs';
import FilterPanel from './components/FilterPanel';
import RequestTable from './components/RequestTable';
import RequestDetail from './components/RequestDetail';
import ShiftImpactDialog from './components/ShiftImpactDialog';
import Pagination from './components/Pagination';
import ToastContainer from './components/ToastContainer';
import ConfirmDialog from './components/ConfirmDialog';
import { ErrorState, LoadingState } from './components/Feedback';

import { useToast } from './hooks/useToast';
import { ADMIN_PASS, ADMIN_USER } from './config';
import {
  EMPTY_FORM,
  ITEMS_PER_PAGE_OPTIONS,
  PRIORITY,
  SHIFT_POLICY,
  STATUS,
  TAB_ACTIVE,
  TAB_BY_STATUS,
  TAB_DONE,
} from './constants';
import {
  createRequest,
  deleteRequest,
  fetchRequests,
  saveBatch,
  updateRequest,
} from './api';
import {
  buildMove,
  buildMoveTo,
  getVisibleRequests,
  isFilterActive,
  normalizeRequest,
  prepareRequests,
  reindexRequests,
  sortRequests,
} from './utils/order';
import {
  buildRestorePlan,
  buildShiftPlan,
  findOverlapCandidates,
} from './utils/schedule';
import { calculateEndDate, normalizeStart, todayKey } from './utils/date';
import {
  balanceRoadmap,
  roadmapProgress,
  syncRoadmapDates,
  validateRoadmap,
} from './utils/roadmap';
import { downloadCsv, requestsToCsv, todayStamp } from './utils/format';

const AUTH_KEY = 'isAuth';

function createEmptyForm() {
  const mulai = todayKey();

  return {
    ...EMPTY_FORM,
    divisi: [],
    roadmap: [],
    mulai,
    durasiHari: 1,
    estimasiSelesai: calculateEndDate(mulai, 1),
  };
}

function validatePayload(payload) {
  if (!payload.nama_orang_req.trim() || !payload.deskripsi.trim()) {
    return 'Nama requester dan deskripsi wajib diisi.';
  }

  if (payload.status !== STATUS.DONE) {
    if (!payload.mulai) return 'Tanggal mulai wajib diisi untuk request aktif.';
    if (!payload.estimasiSelesai) {
      return 'Estimasi selesai tidak valid. Periksa tanggal mulai dan durasi.';
    }
  }

  if (payload.prioritas === PRIORITY.URGENT && !payload.alasanPrioritas) {
    return 'Alasan prioritas wajib diisi untuk request Urgent.';
  }

  return validateRoadmap(payload.roadmap, payload.durasiHari);
}

export default function App() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem(AUTH_KEY) === 'true');
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  const [form, setForm] = useState(createEmptyForm);
  const [formKey, setFormKey] = useState(0);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [shiftPreview, setShiftPreview] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);

  const [activeTab, setActiveTab] = useState(TAB_ACTIVE);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDivisi, setFilterDivisi] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterPrioritas, setFilterPrioritas] = useState('Semua');
  const [filterHealth, setFilterHealth] = useState('Semua');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_OPTIONS[0]);

  const { toasts, notify, dismiss } = useToast();

  const filterOptions = {
    tab: activeTab,
    search: searchQuery,
    divisi: filterDivisi,
    status: filterStatus,
    prioritas: filterPrioritas,
    health: filterHealth,
    dateFrom: filterDateFrom,
    dateTo: filterDateTo,
  };

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
          notify(`Data termuat, tetapi gagal menyimpan pembaruan data: ${error.message}`, 'warning');
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

  const retryLoad = () => {
    setLoadError('');
    setLoading(true);
    loadData();
  };

  const resetForm = () => {
    setForm(createEmptyForm());
    setEditId(null);
    // Remount form agar input durasi kembali ke nilai awal.
    setFormKey((previous) => previous + 1);
  };

  const handleLogin = (event) => {
    event.preventDefault();

    if (loginForm.username === ADMIN_USER && loginForm.password === ADMIN_PASS) {
      setIsLoggedIn(true);
      localStorage.setItem(AUTH_KEY, 'true');
      setShowLoginForm(false);
      setLoginForm({ username: '', password: '' });
      notify('Berhasil login sebagai admin.');
    } else {
      notify('Username atau password salah.', 'error');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem(AUTH_KEY);
    setShowLoginForm(false);
    setDeleteTarget(null);
    setDetailId(null);
    setShiftPreview(null);
    setRestoreTarget(null);
    resetForm();
    notify('Anda telah logout.', 'info');
  };

  const handleToggleLogin = () => {
    setShowLoginForm((previous) => !previous);
    setLoginForm({ username: '', password: '' });
  };

  const handleFormChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const buildPayload = (existing) => {
    const now = new Date().toISOString();
    const mulai = normalizeStart(form.mulai);
    const durasiHari = Math.max(1, Math.floor(Number(form.durasiHari) || 1));
    const estimasiSelesai = mulai ? calculateEndDate(mulai, durasiHari) : null;
    const sourceRoadmap = Array.isArray(form.roadmap) ? form.roadmap : [];
    // Rapikan total durasi roadmap jika pengguna mengubah durasi request.
    const roadmap =
      sourceRoadmap.length > 0
        ? balanceRoadmap(sourceRoadmap, durasiHari, mulai)
        : [];
    const status = form.status;
    const prioritas = form.prioritas;
    const previousWasDone = existing?.status === STATUS.DONE;

    return {
      ...(existing ?? {}),
      nama_orang_req: form.nama_orang_req.trim(),
      divisi: form.divisi,
      deskripsi: form.deskripsi,
      PIC: form.PIC.trim(),
      status,
      prioritas,
      is_priority: prioritas !== PRIORITY.NORMAL,
      alasanPrioritas: form.alasanPrioritas.trim(),
      kebijakanGeser: form.kebijakanGeser,
      lingkupGeser: form.lingkupGeser,
      jadwalTerkunci: form.jadwalTerkunci,
      mulai,
      durasiHari,
      estimasiSelesai,
      roadmap,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      actualStart:
        existing?.actualStart ?? (status === STATUS.ON_PROGRESS ? now : null),
      doneAt:
        status === STATUS.DONE
          ? previousWasDone
            ? existing.doneAt ?? now
            : now
          : null,
    };
  };

  const persistRequest = async ({
    payload,
    existing,
    editId: targetEditId,
    targetTab = activeTab,
    shift = null,
    resetFormAfter = true,
    message = '',
  }) => {
    setSaving(true);

    try {
      let saved;

      if (targetEditId) {
        saved = normalizeRequest(await updateRequest(targetEditId, payload), 0);
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

      let shiftedUpdates = [];
      let shiftError = null;

      if (shift && Array.isArray(shift.selectedIds) && shift.selectedIds.length > 0) {
        const plan = buildShiftPlan(requests, saved, {
          selectedIds: shift.selectedIds,
          reasons: shift.reasons ?? {},
        });
        shiftedUpdates = plan.items.map((entry) => entry.updated);

        try {
          await saveBatch(shiftedUpdates);
        } catch (error) {
          shiftError = error;
        }
      }

      const appliedUpdates = shiftError ? [] : shiftedUpdates;
      const updatedById = new Map(
        appliedUpdates.map((item) => [String(item.id), item]),
      );

      let nextList = targetEditId
        ? requests.map((item) =>
            String(item.id) === String(targetEditId)
              ? { ...saved, urutan: existing?.urutan ?? item.urutan }
              : item,
          )
        : [...requests, saved];

      nextList = nextList.map((item) => updatedById.get(String(item.id)) ?? item);
      nextList = sortRequests(nextList);
      setRequests(nextList);

      if (resetFormAfter) {
        resetForm();
        setActiveTab(targetTab);
        setFilterStatus('Semua');
        setCurrentPage(1);
      }

      if (shiftError) {
        notify(
          `Request tersimpan, tetapi sebagian jadwal gagal digeser: ${shiftError.message}`,
          'warning',
        );
      } else {
        notify(
          message || (targetEditId ? 'Request berhasil diperbarui.' : 'Request baru berhasil ditambahkan.'),
        );
      }

      if (saved.status === STATUS.DONE || saved.prioritas !== PRIORITY.URGENT) {
        const restorePlan = buildRestorePlan(nextList, saved.id);
        if (restorePlan.count > 0) {
          setRestoreTarget({ urgentId: saved.id, name: saved.nama_orang_req });
        }
      }
    } catch (error) {
      notify(error.message || 'Gagal menyimpan request.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const existing = editId
      ? requests.find((item) => String(item.id) === String(editId))
      : null;

    if (editId && !existing) {
      notify('Request yang ingin diedit tidak ditemukan.', 'error');
      return;
    }

    const payload = buildPayload(existing);
    const error = validatePayload(payload);

    if (error) {
      notify(error, 'error');
      return;
    }

    const targetTab = TAB_BY_STATUS[payload.status] ?? TAB_ACTIVE;
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
        setShiftPreview({
          token: Date.now(),
          payload,
          existing,
          editId,
          targetTab,
          urgent: urgentPreview,
          candidates,
          defaultSelectedIds: candidates
            .filter(
              (item) => !item.jadwalTerkunci && item.prioritas !== PRIORITY.URGENT,
            )
            .map((item) => item.id),
          resetFormAfter: true,
        });
        return;
      }
    }

    await persistRequest({
      payload,
      existing,
      editId,
      targetTab,
      message: editId ? 'Request berhasil diperbarui.' : 'Request baru berhasil ditambahkan.',
    });
  };

  const handleConfirmShift = async ({ selectedIds, reasons }) => {
    const preview = shiftPreview;
    if (!preview) return;

    setShiftPreview(null);

    await persistRequest({
      payload: preview.payload,
      existing: preview.existing,
      editId: preview.editId,
      targetTab: preview.targetTab,
      shift: { selectedIds, reasons },
      resetFormAfter: preview.resetFormAfter,
      message: 'Request prioritas tersimpan dan jadwal proyek lain diperbarui.',
    });
  };

  const handleCancelShift = () => {
    setShiftPreview(null);
  };

  const handleEditClick = (req) => {
    setForm({
      nama_orang_req: req.nama_orang_req,
      divisi: [...req.divisi],
      deskripsi: req.deskripsi,
      PIC: req.PIC,
      status: req.status,
      is_priority: req.is_priority,
      prioritas: req.prioritas,
      alasanPrioritas: req.alasanPrioritas,
      kebijakanGeser: req.kebijakanGeser,
      lingkupGeser: req.lingkupGeser,
      jadwalTerkunci: req.jadwalTerkunci,
      mulai: req.mulai ?? '',
      durasiHari: req.durasiHari ?? 1,
      estimasiSelesai: req.estimasiSelesai ?? '',
      roadmap: req.roadmap.map((step) => ({ ...step })),
    });
    setEditId(req.id);
    setDetailId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = async () => {
    const target = deleteTarget;
    if (!target) return;

    setBusyId(target.id);

    try {
      await deleteRequest(target.id);

      const remaining = requests.filter((item) => String(item.id) !== String(target.id));
      const { ordered, changed } = reindexRequests(remaining);
      setRequests(ordered);

      if (changed.length > 0) {
        try {
          await saveBatch(changed);
        } catch {
          // Urutan di UI tetap rapi; akan diselaraskan lagi saat data dimuat ulang.
        }
      }

      if (String(editId) === String(target.id)) resetForm();
      if (String(detailId) === String(target.id)) setDetailId(null);
      setDeleteTarget(null);

      const restorePlan = buildRestorePlan(ordered, target.id);
      if (restorePlan.count > 0) {
        setRestoreTarget({ urgentId: target.id, name: target.nama_orang_req });
      }

      notify('Request berhasil dihapus.');
    } catch (error) {
      notify(error.message || 'Gagal menghapus request.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePriority = async (req) => {
    if (busyId) return;

    const nextPriority =
      req.prioritas === PRIORITY.URGENT ? PRIORITY.NORMAL : PRIORITY.URGENT;

    const payload = {
      ...req,
      prioritas: nextPriority,
      is_priority: nextPriority !== PRIORITY.NORMAL,
      alasanPrioritas:
        nextPriority === PRIORITY.URGENT
          ? req.alasanPrioritas || 'Ditandai Urgent dari daftar request.'
          : '',
      updatedAt: new Date().toISOString(),
    };

    if (
      nextPriority === PRIORITY.URGENT &&
      req.kebijakanGeser !== SHIFT_POLICY.PARALLEL &&
      req.mulai &&
      req.estimasiSelesai
    ) {
      const candidates = findOverlapCandidates(requests, payload, {
        scope: req.lingkupGeser,
      });

      if (candidates.length > 0) {
        setShiftPreview({
          token: Date.now(),
          payload,
          existing: req,
          editId: req.id,
          targetTab: activeTab,
          urgent: payload,
          candidates,
          defaultSelectedIds: candidates
            .filter(
              (item) => !item.jadwalTerkunci && item.prioritas !== PRIORITY.URGENT,
            )
            .map((item) => item.id),
          resetFormAfter: false,
        });
        return;
      }
    }

    await persistRequest({
      payload,
      existing: req,
      editId: req.id,
      targetTab: activeTab,
      resetFormAfter: false,
      message:
        nextPriority === PRIORITY.URGENT
          ? 'Request ditandai sebagai Urgent.'
          : 'Status Urgent dihapus.',
    });
  };

  const handleToggleRoadmapStep = async (req, step) => {
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
            String(item.id) === String(req.id) ? { ...saved, urutan: req.urutan } : item,
          ),
        ),
      );

      const progress = roadmapProgress(saved.roadmap);
      if (
        progress.total > 0 &&
        progress.completed === progress.total &&
        saved.status !== STATUS.DONE
      ) {
        notify('Semua langkah roadmap selesai. Tandai request selesai jika sudah tuntas.');
      }
    } catch (error) {
      notify(error.message || 'Gagal memperbarui langkah roadmap.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const applyOrderChange = async (result) => {
    const previous = requests;
    const previousPage = currentPage;
    setBusyId(result.movedId);
    setRequests(result.ordered);

    // Ikuti baris yang dipindah ke halaman barunya.
    const visible = getVisibleRequests(result.ordered, filterOptions);
    const visibleIndex = visible.findIndex(
      (item) => String(item.id) === String(result.movedId),
    );
    if (visibleIndex >= 0) {
      setCurrentPage(Math.floor(visibleIndex / itemsPerPage) + 1);
    }

    try {
      await saveBatch(result.changed);
    } catch (error) {
      setRequests(previous);
      setCurrentPage(previousPage);
      notify(error.message || 'Gagal menyimpan urutan.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleMove = (id, direction) => {
    if (busyId) return;

    const result = buildMove(requests, id, direction);
    if (!result) {
      notify('Tidak bisa dipindah karena sudah di batas grup prioritas/status.', 'warning');
      return;
    }

    applyOrderChange(result);
  };

  const handleMoveTo = (sourceId, targetId) => {
    if (busyId || String(sourceId) === String(targetId)) return;

    const result = buildMoveTo(requests, sourceId, targetId);
    if (!result) {
      notify('Tidak bisa memindah lintas grup prioritas/status.', 'warning');
      return;
    }

    applyOrderChange(result);
  };

  const handleReopen = async (req) => {
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
            String(item.id) === String(req.id) ? { ...saved, urutan: req.urutan } : item,
          ),
        ),
      );

      setActiveTab(TAB_ACTIVE);
      setFilterStatus('Semua');
      setCurrentPage(1);
      notify('Request dibuka kembali dan masuk ke daftar aktif.');
    } catch (error) {
      setRequests(previous);
      notify(error.message || 'Gagal membuka kembali request.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;

    const plan = buildRestorePlan(requests, restoreTarget.urgentId);
    if (plan.count === 0) {
      setRestoreTarget(null);
      return;
    }

    setSaving(true);

    try {
      await saveBatch(plan.items.map((entry) => entry.updated));
      const restoredById = new Map(
        plan.items.map((entry) => [String(entry.id), entry.updated]),
      );
      setRequests((current) =>
        sortRequests(current.map((item) => restoredById.get(String(item.id)) ?? item)),
      );
      setRestoreTarget(null);
      notify(`${plan.count} proyek dipulihkan ke jadwal semula/slot terdekat.`);
    } catch (error) {
      notify(error.message || 'Gagal memulihkan jadwal.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFilterStatus('Semua');
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterDivisi('Semua');
    setFilterStatus('Semua');
    setFilterPrioritas('Semua');
    setFilterHealth('Semua');
    setFilterDateFrom('');
    setFilterDateTo('');
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (visibleRequests.length === 0) {
      notify('Tidak ada data untuk diexport.', 'warning');
      return;
    }

    downloadCsv(
      `it-request-${activeTab}-${todayStamp()}.csv`,
      requestsToCsv(visibleRequests, 0, requests),
    );
    notify('File CSV berhasil diunduh.');
  };

  const counts = {
    active: requests.filter(
      (item) => item.status === STATUS.ON_PROGRESS || item.status === STATUS.WAITING,
    ).length,
    pending: requests.filter((item) => item.status === STATUS.PENDING).length,
    done: requests.filter((item) => item.status === STATUS.DONE).length,
  };

  const visibleRequests = getVisibleRequests(requests, filterOptions);
  const filtering = isFilterActive(filterOptions);
  const detailRequest = detailId
    ? requests.find((item) => String(item.id) === String(detailId)) ?? null
    : null;
  const restorePlan = restoreTarget
    ? buildRestorePlan(requests, restoreTarget.urgentId)
    : null;

  const totalPages = Math.max(1, Math.ceil(visibleRequests.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const canReorder = !filtering && activeTab !== TAB_DONE;

  return (
    <div className="container">
      <Header
        isLoggedIn={isLoggedIn}
        showLoginForm={showLoginForm}
        onToggleLogin={handleToggleLogin}
        onLogout={handleLogout}
      />

      {!isLoggedIn && showLoginForm && (
        <LoginForm
          form={loginForm}
          onChange={(field, value) => setLoginForm((previous) => ({ ...previous, [field]: value }))}
          onSubmit={handleLogin}
          onCancel={handleToggleLogin}
        />
      )}

      {isLoggedIn && (
        <RequestForm
          key={editId ? `edit-${editId}` : `new-${formKey}`}
          form={form}
          editing={Boolean(editId)}
          saving={saving}
          onChange={handleFormChange}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
      )}

      <Tabs activeTab={activeTab} counts={counts} onChange={handleTabChange} />

      <FilterPanel
        tab={activeTab}
        search={searchQuery}
        divisi={filterDivisi}
        status={filterStatus}
        prioritas={filterPrioritas}
        health={filterHealth}
        dateFrom={filterDateFrom}
        dateTo={filterDateTo}
        isFiltering={filtering}
        canExport={visibleRequests.length > 0}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setCurrentPage(1);
        }}
        onDivisiChange={(value) => {
          setFilterDivisi(value);
          setCurrentPage(1);
        }}
        onStatusChange={(value) => {
          setFilterStatus(value);
          setCurrentPage(1);
        }}
        onPrioritasChange={(value) => {
          setFilterPrioritas(value);
          setCurrentPage(1);
        }}
        onHealthChange={(value) => {
          setFilterHealth(value);
          setCurrentPage(1);
        }}
        onDateFromChange={(value) => {
          setFilterDateFrom(value);
          setCurrentPage(1);
        }}
        onDateToChange={(value) => {
          setFilterDateTo(value);
          setCurrentPage(1);
        }}
        onReset={resetFilters}
        onExport={handleExport}
      />

      {loading ? (
        <LoadingState />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={retryLoad} />
      ) : (
        <>
          <RequestTable
            items={visibleRequests}
            page={safePage}
            itemsPerPage={itemsPerPage}
            isLoggedIn={isLoggedIn}
            tab={activeTab}
            canReorder={canReorder}
            busy={Boolean(busyId) || saving}
            onMove={handleMove}
            onMoveTo={handleMoveTo}
            onTogglePriority={handleTogglePriority}
            onEdit={handleEditClick}
            onDelete={setDeleteTarget}
            onReopen={handleReopen}
            onDetail={(req) => setDetailId(req.id)}
          />

          <Pagination
            page={safePage}
            totalPages={totalPages}
            totalItems={visibleRequests.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(value) => {
              setItemsPerPage(value);
              setCurrentPage(1);
            }}
          />
        </>
      )}

      {detailRequest && (
        <RequestDetail
          request={detailRequest}
          busy={Boolean(busyId) || saving}
          isLoggedIn={isLoggedIn}
          onClose={() => setDetailId(null)}
          onToggleStep={handleToggleRoadmapStep}
        />
      )}

      {shiftPreview && (
        <ShiftImpactDialog
          key={shiftPreview.token}
          urgent={shiftPreview.urgent}
          requests={requests}
          candidates={shiftPreview.candidates}
          defaultSelectedIds={shiftPreview.defaultSelectedIds}
          busy={saving}
          onConfirm={handleConfirmShift}
          onCancel={handleCancelShift}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus request?"
        message={
          deleteTarget
            ? `Request dari "${deleteTarget.nama_orang_req}" akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
            : ''
        }
        confirmLabel="Ya, Hapus"
        busy={Boolean(busyId)}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        title="Pulihkan jadwal proyek tergeser?"
        message={
          restoreTarget
            ? `${restoreTarget.name || 'Request'} sudah tidak menjadi prioritas aktif. ${
                restorePlan?.count ?? 0
              } proyek dapat dipulihkan ke jadwal semula. Jika slot aslinya sudah terpakai, proyek akan dipindah ke slot terdekat.`
            : ''
        }
        confirmLabel="Ya, Pulihkan"
        busy={saving}
        onConfirm={handleRestore}
        onCancel={() => setRestoreTarget(null)}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
