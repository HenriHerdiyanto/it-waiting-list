import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/Feedback';
import PicAvatar from '../components/PicAvatar';
import PicLoadChart from '../components/PicLoadChart';
import PicRoleDonut from '../components/PicRoleDonut';
import ScheduleBadge, { PriorityBadge } from '../components/ScheduleBadge';
import { useData } from '../contexts/DataContext';
import { PIC_ROLES, PRIORITY, STATUS } from '../constants';
import { formatDateRange, getDisplayDescription } from '../utils/format';
import { formatPicNames, picRoleClass } from '../utils/pic';
import {
  PIC_SCOPE,
  UNASSIGNED_KEY,
  UNREGISTERED_ROLE,
  buildPicStats,
  filterPicRows,
  filterRequestsByScope,
} from '../utils/picStats';

const STATUS_CLASS = {
  [STATUS.WAITING]: 'status-waiting',
  [STATUS.ON_PROGRESS]: 'status-proses',
  [STATUS.REVISI]: 'status-revisi',
  [STATUS.PENDING]: 'status-pending',
  [STATUS.DONE]: 'status-done',
};

const SCOPES = [
  { id: PIC_SCOPE.ALL, label: 'Semua' },
  { id: PIC_SCOPE.ACTIVE, label: 'Aktif' },
  { id: PIC_SCOPE.DONE, label: 'Selesai' },
];

const AVERAGE_FORMATTER = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 1,
});

function divisionLabel(request) {
  if (Array.isArray(request.divisi) && request.divisi.length > 0) {
    return request.divisi.join(', ');
  }

  return 'Management';
}

export default function PicStatsPage() {
  const { requests, loading, loadError, retryLoad, pics, picLoading } =
    useData();

  const [scope, setScope] = useState(PIC_SCOPE.ALL);
  const [role, setRole] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState(null);

  const scopedRequests = useMemo(
    () => filterRequestsByScope(requests, scope),
    [requests, scope],
  );

  const stats = useMemo(
    () => buildPicStats(scopedRequests, pics),
    [scopedRequests, pics],
  );

  const filteredRows = useMemo(
    () => filterPicRows(stats.rows, { role, search }),
    [stats.rows, role, search],
  );

  const showUnassigned = useMemo(() => {
    if (!stats.unassigned || role !== 'all') return false;

    const term = search.trim().toLowerCase();
    if (!term) return true;

    return 'belum ada pic tanpa pic'.includes(term);
  }, [stats.unassigned, role, search]);

  const chartRows = useMemo(
    () =>
      showUnassigned
        ? [...filteredRows, stats.unassigned]
        : filteredRows,
    [filteredRows, showUnassigned, stats.unassigned],
  );

  const selectedRow = useMemo(
    () =>
      chartRows.find((row) => row.key === selectedKey) ??
      chartRows[0] ??
      null,
    [chartRows, selectedKey],
  );

  const idleRows = useMemo(
    () => stats.rows.filter((row) => row.registered && row.total === 0),
    [stats.rows],
  );

  const roleOptions = useMemo(() => {
    const names = [...PIC_ROLES, UNREGISTERED_ROLE];
    const countByRole = new Map(
      stats.roleTotals.map((item) => [item.role, item.count]),
    );

    stats.roleTotals.forEach((item) => {
      if (!names.includes(item.role)) names.push(item.role);
    });

    return names.map((name) => ({
      role: name,
      count: countByRole.get(name) ?? 0,
    }));
  }, [stats.roleTotals]);

  if (loading || picLoading) return <LoadingState />;
  if (loadError) return <ErrorState message={loadError} onRetry={retryLoad} />;

  const { summary } = stats;
  const activeCount = scopedRequests.filter(
    (request) => request.status !== STATUS.DONE,
  ).length;
  const doneCount = scopedRequests.filter(
    (request) => request.status === STATUS.DONE,
  ).length;
  const scopeWord =
    scope === PIC_SCOPE.ACTIVE
      ? 'aktif'
      : scope === PIC_SCOPE.DONE
        ? 'selesai'
        : '';
  const busiest = summary.busiest;
  const insight = busiest
    ? `${busiest.nama} memegang request terbanyak: ${busiest.total} request${
        scopeWord ? ` ${scopeWord}` : ''
      }${busiest.active > 0 ? `, ${busiest.active} masih berjalan` : ''}.`
    : 'Belum ada request pada filter ini. Tambahkan PIC ke request untuk mulai melihat beban kerja tim.';
  const hasFilter = role !== 'all' || search.trim() !== '';

  const selectUnassigned = () => {
    setRole('all');
    setSearch('');
    setSelectedKey(UNASSIGNED_KEY);
    window.requestAnimationFrame(() => {
      document
        .getElementById('pic-stats-detail')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="dashboard-page pic-stats-page">
      <section className="analytics-hero">
        <div className="analytics-hero-copy">
          <span className="hero-kicker">Workload Analytics</span>
          <h2>Peta Beban PIC</h2>
          <p>{insight}</p>

          <div className="analytics-hero-actions hero-actions">
            <Link to="/admin/pic" className="btn btn-primary">
              Kelola Master PIC
            </Link>
            <Link to="/admin/waiting-list" className="btn btn-outline">
              Lihat Waiting List
            </Link>
          </div>
        </div>

        <div className="analytics-hero-spotlight">
          <span className="analytics-spotlight-label">
            <span aria-hidden="true">🔥</span> PIC tersibuk
          </span>

          {busiest ? (
            <>
              <div className="analytics-spotlight-person">
                <PicAvatar name={busiest.nama} size="lg" />
                <div>
                  <strong>{busiest.nama}</strong>
                  <span className={`role-badge ${picRoleClass(busiest.role)}`}>
                    {busiest.role}
                  </span>
                </div>
              </div>

              <div className="analytics-spotlight-stats">
                <div>
                  <strong>{busiest.total}</strong>
                  <span>request</span>
                </div>
                <div>
                  <strong>{busiest.active}</strong>
                  <span>aktif</span>
                </div>
              </div>
            </>
          ) : (
            <p className="analytics-spotlight-empty">
              Belum ada penugasan pada filter ini.
            </p>
          )}
        </div>
      </section>

      <section className="analytics-kpis" aria-label="Ringkasan beban PIC">
        <article className="analytics-kpi kpi-indigo">
          <span className="analytics-kpi-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
              <path d="M8 8h8M8 12h8M8 16h5" />
            </svg>
          </span>
          <div className="analytics-kpi-body">
            <span className="analytics-kpi-label">Total Request</span>
            <strong className="analytics-kpi-value">{summary.totalRequests}</strong>
            <small>
              {activeCount} aktif · {doneCount} selesai
            </small>
          </div>
        </article>

        <article className="analytics-kpi kpi-emerald">
          <span className="analytics-kpi-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="9" cy="8" r="3" />
              <path d="M3.5 19c0-3 2.4-5 5.5-5s5.5 2 5.5 5" />
              <circle cx="17" cy="9.5" r="2.3" />
              <path d="M15.5 14.5c2.8.1 5 2 5 4.5" />
            </svg>
          </span>
          <div className="analytics-kpi-body">
            <span className="analytics-kpi-label">PIC Terlibat</span>
            <strong className="analytics-kpi-value">{summary.involvedPics}</strong>
            <small>dari {summary.registeredPics} PIC terdaftar</small>
          </div>
        </article>

        <article className="analytics-kpi kpi-amber">
          <span className="analytics-kpi-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 19V5M4 19h16" />
              <path d="M7 15l4-4 3 2.5 5-6.5" />
              <circle cx="7" cy="15" r="1" />
              <circle cx="11" cy="11" r="1" />
              <circle cx="14" cy="13.5" r="1" />
            </svg>
          </span>
          <div className="analytics-kpi-body">
            <span className="analytics-kpi-label">Rata-rata Beban</span>
            <strong className="analytics-kpi-value">
              {AVERAGE_FORMATTER.format(summary.average)}
            </strong>
            <small>per PIC terlibat</small>
          </div>
        </article>

        <article className="analytics-kpi kpi-rose">
          <span className="analytics-kpi-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-1.8.9-3.1 2-4.2 0 2 .8 3 1.7 3 .1-2.7 1.3-5.4 1.3-7.8Z" />
            </svg>
          </span>
          <div className="analytics-kpi-body">
            <span className="analytics-kpi-label">PIC Tersibuk</span>
            <strong className="analytics-kpi-value is-name">
              {busiest?.nama ?? '—'}
            </strong>
            <small>
              {busiest
                ? `${busiest.total} request · ${busiest.active} aktif`
                : 'Belum ada penugasan'}
            </small>
          </div>
        </article>
      </section>

      {summary.unassignedCount > 0 ? (
        <button
          type="button"
          className="analytics-alert"
          onClick={selectUnassigned}
        >
          <span className="analytics-alert-icon" aria-hidden="true">
            !
          </span>
          <span>
            <strong>
              {summary.unassignedCount} request belum memiliki PIC.
            </strong>{' '}
            Klik untuk melihat daftar request yang belum ditugaskan.
          </span>
          <span className="analytics-alert-arrow" aria-hidden="true">
            →
          </span>
        </button>
      ) : null}

      <div className="analytics-main-grid">
        <section className="panel pic-load-panel">
          <div className="panel-head analytics-chart-head">
            <div>
              <h3>Peringkat Beban PIC</h3>
              <p>
                {filteredRows.length} PIC ditampilkan · klik bar untuk melihat
                detail request.
              </p>
            </div>

            <div
              className="analytics-scope"
              role="group"
              aria-label="Rentang request"
            >
              {SCOPES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={scope === item.id ? 'is-active' : ''}
                  onClick={() => setScope(item.id)}
                  aria-pressed={scope === item.id}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="analytics-toolbar">
            <label className="analytics-search">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
              <span className="sr-only">Cari nama PIC</span>
              <input
                type="search"
                placeholder="Cari nama PIC..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              aria-label="Filter role PIC"
            >
              <option value="all">Semua role</option>
              {roleOptions.map((item) => (
                <option key={item.role} value={item.role}>
                  {item.role} ({item.count})
                </option>
              ))}
            </select>

            {hasFilter ? (
              <button
                type="button"
                className="analytics-reset"
                onClick={() => {
                  setRole('all');
                  setSearch('');
                }}
              >
                Reset
              </button>
            ) : null}
          </div>

          <PicLoadChart
            rows={chartRows}
            selectedKey={selectedRow?.key ?? null}
            onSelect={setSelectedKey}
            emptyMessage="Tidak ada PIC yang cocok dengan pencarian atau role ini."
          />
        </section>

        <aside className="analytics-side">
          <section className="panel pic-role-panel">
            <div className="panel-head">
              <div>
                <h3>Beban per Role</h3>
                <p>Distribusi penugasan PIC pada rentang yang dipilih.</p>
              </div>
            </div>

            <PicRoleDonut
              data={stats.roleTotals}
              total={summary.totalAssignments}
              activeRole={role}
              onSelect={(nextRole) =>
                setRole((current) => (current === nextRole ? 'all' : nextRole))
              }
            />
          </section>
        </aside>
      </div>

      {summary.registeredPics > 0 && idleRows.length > 0 ? (
        <section className="panel pic-idle-panel">
          <div className="panel-head">
            <div>
              <h3>PIC Tanpa Beban</h3>
              <p>PIC terdaftar yang belum memegang request pada filter ini.</p>
            </div>
            <span className="analytics-count-badge">{idleRows.length}</span>
          </div>

          <ul className="pic-idle-list">
            {idleRows.map((row) => (
              <li key={row.key}>
                <PicAvatar name={row.nama} size="sm" />
                <span className="pic-idle-copy">
                  <strong>{row.nama}</strong>
                  <span className={`role-badge ${picRoleClass(row.role)}`}>
                    {row.role}
                  </span>
                </span>
                <span className="pic-idle-zero">0</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        className="panel pic-detail-panel"
        id="pic-stats-detail"
        aria-live="polite"
      >
        {selectedRow ? (
          <>
            <div className="panel-head pic-detail-head">
              <div className="pic-detail-person">
                <PicAvatar
                  name={selectedRow.nama}
                  muted={selectedRow.isUnassigned}
                  size="lg"
                />
                <div>
                  <h3>
                    {selectedRow.isUnassigned
                      ? 'Request tanpa PIC'
                      : `Request ${selectedRow.nama}`}
                  </h3>
                  <p>
                    {selectedRow.isUnassigned
                      ? 'Request berikut belum ditugaskan ke PIC mana pun.'
                      : 'Daftar request yang dipegang PIC ini pada filter aktif.'}
                  </p>
                  {!selectedRow.isUnassigned ? (
                    <span
                      className={`role-badge ${picRoleClass(selectedRow.role)}`}
                    >
                      {selectedRow.role}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="pic-detail-summary">
                <span className="pic-detail-pill is-total">
                  <strong>{selectedRow.total}</strong> request
                </span>
                {selectedRow.active > 0 ? (
                  <span className="pic-detail-pill is-active">
                    <strong>{selectedRow.active}</strong> aktif
                  </span>
                ) : null}
                {selectedRow.done > 0 ? (
                  <span className="pic-detail-pill is-done">
                    <strong>{selectedRow.done}</strong> selesai
                  </span>
                ) : null}
                {selectedRow.urgent > 0 ? (
                  <span className="pic-detail-pill is-urgent">
                    <strong>{selectedRow.urgent}</strong> urgent
                  </span>
                ) : null}
              </div>
            </div>

            {selectedRow.requests.length === 0 ? (
              <p className="dash-empty">
                PIC ini belum memegang request pada filter ini.
              </p>
            ) : (
              <div className="analytics-request-list">
                {selectedRow.requests.map((request) => (
                  <Link
                    key={request.id}
                    to={`/admin/waiting-list/${request.id}/edit`}
                    className="analytics-request-card"
                  >
                    <div className="analytics-request-main">
                      <div className="analytics-request-title">
                        <span
                          className={`badge ${
                            STATUS_CLASS[request.status] ?? ''
                          }`}
                        >
                          {request.status}
                        </span>
                        <strong>
                          {request.nama_orang_req || 'Tanpa nama'}
                        </strong>
                      </div>
                      <p>
                        {getDisplayDescription(request) ||
                          'Belum ada deskripsi request.'}
                      </p>
                    </div>

                    <div className="analytics-request-meta">
                      <span className="analytics-request-divisi">
                        {divisionLabel(request)}
                      </span>
                      <span>
                        {formatDateRange(
                          request.mulai,
                          request.estimasiSelesai,
                        )}
                      </span>
                      <ScheduleBadge item={request} showShifted={false} />
                      {!selectedRow.isUnassigned ? (
                        <span className="analytics-request-team">
                          Tim: {formatPicNames(request.PIC)}
                        </span>
                      ) : null}
                    </div>

                    <div className="analytics-request-side">
                      {request.prioritas !== PRIORITY.NORMAL ? (
                        <PriorityBadge value={request.prioritas} />
                      ) : null}
                      <span className="analytics-request-open">
                        Buka <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="dash-empty">
            Tidak ada PIC atau request yang bisa ditampilkan pada filter ini.
          </p>
        )}
      </section>
    </div>
  );
}
