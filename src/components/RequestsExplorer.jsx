import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ITEMS_PER_PAGE_OPTIONS,
  PRIORITY,
  STATUS,
  TAB_ACTIVE,
  TAB_DONE,
  TAB_PENDING,
  TAB_REVISI,
} from '../constants';
import {
  buildMove,
  buildMoveTo,
  getVisibleRequests,
  isFilterActive,
} from '../utils/order';
import { downloadCsv, requestsToCsv, todayStamp } from '../utils/format';
import { useData } from '../contexts/DataContext';
import { useToastContext } from '../contexts/ToastContext';
import Tabs from './Tabs';
import FilterPanel from './FilterPanel';
import RequestTable from './RequestTable';
import RequestDetail from './RequestDetail';
import Pagination from './Pagination';
import ShiftImpactDialog from './ShiftImpactDialog';
import { ErrorState, LoadingState } from './Feedback';

const VALID_TABS = [TAB_ACTIVE, TAB_REVISI, TAB_PENDING, TAB_DONE];

export default function RequestsExplorer({
  isAdmin = false,
  onEdit,
  onDelete,
  onRevise,
}) {
  const {
    requests,
    loading,
    loadError,
    saving,
    busyId,
    retryLoad,
    submitRequest,
    completeShift,
    applyOrder,
    reopenRequest,
    toggleRoadmapStep,
  } = useData();
  const { notify } = useToastContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = VALID_TABS.includes(searchParams.get('tab'))
    ? searchParams.get('tab')
    : TAB_ACTIVE;

  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDivisi, setFilterDivisi] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterPrioritas, setFilterPrioritas] = useState('Semua');
  const [filterHealth, setFilterHealth] = useState('Semua');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_OPTIONS[0]);
  const [detailId, setDetailId] = useState(null);
  const [shiftPreview, setShiftPreview] = useState(null);

  const tabParam = searchParams.get('tab');

  useEffect(() => {
    if (!VALID_TABS.includes(tabParam)) return;
    // Sinkronkan tab saat URL berubah (mis. setelah revisi/buka kembali).
    // oxlint-disable-next-line react/set-state-in-effect
    setActiveTab(tabParam);
    setFilterStatus('Semua');
    setCurrentPage(1);
  }, [tabParam]);

  const filterOptions = useMemo(
    () => ({
      tab: activeTab,
      search: searchQuery,
      divisi: filterDivisi,
      status: filterStatus,
      prioritas: filterPrioritas,
      health: filterHealth,
      dateFrom: filterDateFrom,
      dateTo: filterDateTo,
    }),
    [
      activeTab,
      searchQuery,
      filterDivisi,
      filterStatus,
      filterPrioritas,
      filterHealth,
      filterDateFrom,
      filterDateTo,
    ],
  );

  const counts = useMemo(
    () => ({
      active: requests.filter(
        (item) =>
          item.status === STATUS.ON_PROGRESS || item.status === STATUS.WAITING,
      ).length,
      revisi: requests.filter((item) => item.status === STATUS.REVISI).length,
      pending: requests.filter((item) => item.status === STATUS.PENDING).length,
      done: requests.filter((item) => item.status === STATUS.DONE).length,
    }),
    [requests],
  );

  const visibleRequests = useMemo(
    () => getVisibleRequests(requests, filterOptions),
    [requests, filterOptions],
  );
  const filtering = isFilterActive(filterOptions);
  const detailRequest = detailId
    ? requests.find((item) => String(item.id) === String(detailId)) ?? null
    : null;

  const totalPages = Math.max(1, Math.ceil(visibleRequests.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const canReorder = isAdmin && !filtering && activeTab !== TAB_DONE;

  const moveToMovedPage = (ordered, movedId) => {
    const visible = getVisibleRequests(ordered, filterOptions);
    const visibleIndex = visible.findIndex(
      (item) => String(item.id) === String(movedId),
    );
    if (visibleIndex >= 0) {
      setCurrentPage(Math.floor(visibleIndex / itemsPerPage) + 1);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
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

  const handleMove = async (id, direction) => {
    if (busyId) return;

    const result = buildMove(requests, id, direction);
    if (!result) {
      notify(
        'Tidak bisa dipindah karena sudah di batas grup prioritas/status.',
        'warning',
      );
      return;
    }

    const ok = await applyOrder(result);
    if (ok) moveToMovedPage(result.ordered, result.movedId);
  };

  const handleMoveTo = async (sourceId, targetId) => {
    if (busyId || String(sourceId) === String(targetId)) return;

    const result = buildMoveTo(requests, sourceId, targetId);
    if (!result) {
      notify('Tidak bisa memindah lintas grup prioritas/status.', 'warning');
      return;
    }

    const ok = await applyOrder(result);
    if (ok) moveToMovedPage(result.ordered, result.movedId);
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

    const result = await submitRequest({
      payload,
      existing: req,
      targetTab: activeTab,
      message:
        nextPriority === PRIORITY.URGENT
          ? 'Request ditandai sebagai Urgent.'
          : 'Status Urgent dihapus.',
    });

    if (result.preview) setShiftPreview(result.preview);
  };

  const handleConfirmShift = async ({ selectedIds }) => {
    const preview = shiftPreview;
    if (!preview) return;

    setShiftPreview(null);
    await completeShift(preview, selectedIds);
  };

  const handleReopen = async (req) => {
    const ok = await reopenRequest(req);
    if (ok) {
      setActiveTab(TAB_ACTIVE);
      setSearchParams({ tab: TAB_ACTIVE }, { replace: true });
      setFilterStatus('Semua');
      setCurrentPage(1);
      setDetailId(null);
    }
  };

  const busy = Boolean(busyId) || saving;

  return (
    <>
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
            isLoggedIn={isAdmin}
            tab={activeTab}
            canReorder={canReorder}
            busy={busy}
            onMove={handleMove}
            onMoveTo={handleMoveTo}
            onTogglePriority={handleTogglePriority}
            onEdit={onEdit}
            onDelete={onDelete}
            onReopen={handleReopen}
            onRevise={onRevise}
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
          busy={busy}
          isLoggedIn={isAdmin}
          onClose={() => setDetailId(null)}
          onToggleStep={toggleRoadmapStep}
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
          onCancel={() => setShiftPreview(null)}
        />
      )}
    </>
  );
}
