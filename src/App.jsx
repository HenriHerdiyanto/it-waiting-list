import { useCallback, useEffect, useState } from 'react';
import './App.css';

import Header from './components/Header';
import LoginForm from './components/LoginForm';
import RequestForm from './components/RequestForm';
import Tabs from './components/Tabs';
import FilterPanel from './components/FilterPanel';
import RequestTable from './components/RequestTable';
import Pagination from './components/Pagination';
import ToastContainer from './components/ToastContainer';
import ConfirmDialog from './components/ConfirmDialog';
import { ErrorState, LoadingState } from './components/Feedback';

import { useToast } from './hooks/useToast';
import { ADMIN_PASS, ADMIN_USER } from './config';
import {
  EMPTY_FORM,
  ITEMS_PER_PAGE_OPTIONS,
  STATUS,
  TAB_ACTIVE,
  TAB_BY_STATUS,
  TAB_DONE,
} from './constants';
import {
  createRequest,
  deleteRequest,
  fetchRequests,
  saveOrderChanges,
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
import { downloadCsv, requestsToCsv, todayStamp } from './utils/format';

const AUTH_KEY = 'isAuth';

export default function App() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem(AUTH_KEY) === 'true');
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [activeTab, setActiveTab] = useState(TAB_ACTIVE);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDivisi, setFilterDivisi] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_OPTIONS[0]);

  const { toasts, notify, dismiss } = useToast();

  const loadData = useCallback(async () => {
    try {
      const raw = await fetchRequests();
      const { ordered, changed } = prepareRequests(Array.isArray(raw) ? raw : []);
      setRequests(ordered);

      // Sembuhkan urutan yang duplikat/hilang sekali saja, lalu simpan permanen.
      if (changed.length > 0) {
        try {
          await saveOrderChanges(changed);
        } catch (error) {
          notify(`Data termuat, tetapi gagal menyimpan pembaruan urutan: ${error.message}`, 'warning');
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
    setForm({ ...EMPTY_FORM, divisi: [] });
    setEditId(null);
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    if (!form.nama_orang_req.trim() || !form.deskripsi.trim()) {
      notify('Nama requester dan deskripsi wajib diisi.', 'error');
      return;
    }

    const targetTab = TAB_BY_STATUS[form.status] ?? TAB_ACTIVE;
    setSaving(true);

    try {
      if (editId) {
        const existing = requests.find((item) => String(item.id) === String(editId));
        if (!existing) throw new Error('Request yang ingin diedit tidak ditemukan.');

        const existingDoneAt = existing.status === STATUS.DONE ? existing.doneAt : null;
        const doneAt =
          form.status === STATUS.DONE ? existingDoneAt || new Date().toISOString() : null;

        const payload = { ...existing, ...form, doneAt };
        const saved = normalizeRequest(await updateRequest(editId, payload), 0);

        setRequests((previous) =>
          sortRequests(
            previous.map((item) =>
              String(item.id) === String(editId) ? { ...saved, urutan: existing.urutan } : item,
            ),
          ),
        );
        notify('Request berhasil diperbarui.');
      } else {
        const maxUrutan = requests.reduce(
          (max, item) => Math.max(max, Number(item.urutan) || 0),
          0,
        );
        const payload = {
          ...form,
          urutan: maxUrutan + 1,
          doneAt: form.status === STATUS.DONE ? new Date().toISOString() : null,
        };
        const created = normalizeRequest(await createRequest(payload), 0);

        setRequests((previous) => sortRequests([...previous, created]));
        notify('Request baru berhasil ditambahkan.');
      }

      resetForm();
      setActiveTab(targetTab);
      setFilterStatus('Semua');
      setCurrentPage(1);
    } catch (error) {
      notify(error.message || 'Gagal menyimpan request.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (req) => {
    setForm({
      nama_orang_req: req.nama_orang_req,
      divisi: [...req.divisi],
      deskripsi: req.deskripsi,
      PIC: req.PIC,
      status: req.status,
      is_priority: req.is_priority,
    });
    setEditId(req.id);
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
          await saveOrderChanges(changed);
        } catch {
          // Urutan di UI tetap rapi; akan diselaraskan lagi saat data dimuat ulang.
        }
      }

      if (String(editId) === String(target.id)) resetForm();
      setDeleteTarget(null);
      notify('Request berhasil dihapus.');
    } catch (error) {
      notify(error.message || 'Gagal menghapus request.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePriority = async (req) => {
    const previous = requests;
    const nextPriority = !req.is_priority;
    setBusyId(req.id);

    setRequests(
      sortRequests(
        previous.map((item) =>
          String(item.id) === String(req.id) ? { ...item, is_priority: nextPriority } : item,
        ),
      ),
    );

    try {
      const saved = normalizeRequest(
        await updateRequest(req.id, { ...req, is_priority: nextPriority }),
        0,
      );

      setRequests((current) =>
        sortRequests(
          current.map((item) =>
            String(item.id) === String(req.id) ? { ...saved, urutan: req.urutan } : item,
          ),
        ),
      );

      notify(
        nextPriority ? 'Request ditandai sebagai VIP.' : 'Status VIP request dihapus.',
        'info',
      );
    } catch (error) {
      setRequests(previous);
      notify(error.message || 'Gagal mengubah prioritas.', 'error');
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
    const visible = getVisibleRequests(result.ordered, {
      tab: activeTab,
      search: searchQuery,
      divisi: filterDivisi,
      status: filterStatus,
    });
    const visibleIndex = visible.findIndex(
      (item) => String(item.id) === String(result.movedId),
    );
    if (visibleIndex >= 0) {
      setCurrentPage(Math.floor(visibleIndex / itemsPerPage) + 1);
    }

    try {
      await saveOrderChanges(result.changed);
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
        await updateRequest(req.id, { ...req, status: STATUS.WAITING, doneAt: null }),
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFilterStatus('Semua');
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterDivisi('Semua');
    setFilterStatus('Semua');
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (visibleRequests.length === 0) {
      notify('Tidak ada data untuk diexport.', 'warning');
      return;
    }

    downloadCsv(
      `it-request-${activeTab}-${todayStamp()}.csv`,
      requestsToCsv(visibleRequests),
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

  const visibleRequests = getVisibleRequests(requests, {
    tab: activeTab,
    search: searchQuery,
    divisi: filterDivisi,
    status: filterStatus,
  });

  const filtering = isFilterActive({
    search: searchQuery,
    divisi: filterDivisi,
    status: filterStatus,
  });

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
            busy={Boolean(busyId)}
            onMove={handleMove}
            onMoveTo={handleMoveTo}
            onTogglePriority={handleTogglePriority}
            onEdit={handleEditClick}
            onDelete={setDeleteTarget}
            onReopen={handleReopen}
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

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
