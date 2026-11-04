import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { ErrorState, LoadingState } from '../components/Feedback';
import { useData } from '../contexts/DataContext';
import {
  PIC_ROLES,
  PIC_ROLE_DESCRIPTION,
  PRIORITY,
  SCHEDULE_STATUS,
  STATUS,
} from '../constants';
import { todayKey } from '../utils/date';
import { formatDate, formatDateTime } from '../utils/format';
import { formatPicNames } from '../utils/pic';
import { getOverdueDays, getScheduleStatus } from '../utils/schedule';

const STATUS_CLASS = {
  [STATUS.WAITING]: 'status-waiting',
  [STATUS.ON_PROGRESS]: 'status-proses',
  [STATUS.REVISI]: 'status-revisi',
  [STATUS.PENDING]: 'status-pending',
  [STATUS.DONE]: 'status-done',
};

const TAB_BY_STATUS = {
  [STATUS.ON_PROGRESS]: 'active',
  [STATUS.WAITING]: 'active',
  [STATUS.REVISI]: 'revisi',
  [STATUS.PENDING]: 'pending',
  [STATUS.DONE]: 'done',
};

function EmptyList({ children }) {
  return <p className="dash-empty">{children}</p>;
}

export default function DashboardPage() {
  const { requests, loading, loadError, retryLoad, pics, picLoading } =
    useData();

  if (loading) return <LoadingState />;
  if (loadError) return <ErrorState message={loadError} onRetry={retryLoad} />;

  const today = todayKey();
  const active = requests.filter(
    (item) =>
      item.status === STATUS.ON_PROGRESS || item.status === STATUS.WAITING,
  );
  const revisi = requests.filter((item) => item.status === STATUS.REVISI);
  const pending = requests.filter((item) => item.status === STATUS.PENDING);
  const done = requests.filter((item) => item.status === STATUS.DONE);
  const urgent = requests.filter(
    (item) => item.prioritas === PRIORITY.URGENT && item.status !== STATUS.DONE,
  );
  const overdue = requests
    .filter((item) => getScheduleStatus(item) === SCHEDULE_STATUS.OVERDUE)
    .sort((a, b) => getOverdueDays(b) - getOverdueDays(a));

  const working = requests.filter((item) => item.status !== STATUS.DONE);

  const attention = [
    ...overdue,
    ...urgent.filter(
      (item) => !overdue.some((entry) => String(entry.id) === String(item.id)),
    ),
  ].slice(0, 5);

  const upcoming = working
    .filter((item) => item.mulai && item.mulai >= today)
    .sort((a, b) => a.mulai.localeCompare(b.mulai))
    .slice(0, 5);

  const recent = [...requests]
    .sort((a, b) =>
      String(b.updatedAt ?? b.createdAt ?? '').localeCompare(
        String(a.updatedAt ?? a.createdAt ?? ''),
      ),
    )
    .slice(0, 5);

  const divisiMap = new Map();
  working.forEach((item) => {
    const list = item.divisi.length > 0 ? item.divisi : ['Management'];
    list.forEach((divisi) => {
      divisiMap.set(divisi, (divisiMap.get(divisi) ?? 0) + 1);
    });
  });
  const divisiRows = [...divisiMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const maxDivisi = Math.max(1, ...divisiRows.map((row) => row.count));

  const roleRows = PIC_ROLES.map((role) => ({
    role,
    description: PIC_ROLE_DESCRIPTION[role],
    count: pics.filter((item) => item.role === role).length,
  }));

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <span className="hero-kicker">Overview</span>
          <h2>Selamat datang kembali, Admin 👋</h2>
          <p>
            Ada <strong>{working.length}</strong> request berjalan dan{' '}
            <strong>{overdue.length}</strong> request yang perlu perhatian.
          </p>
        </div>

        <div className="hero-actions">
          <Link to="/admin/waiting-list/new" className="btn btn-primary">
            + Tambah Request
          </Link>
          <Link to="/admin/pic" className="btn btn-outline">
            Kelola PIC
          </Link>
        </div>
      </section>

      <section className="stat-grid" aria-label="Statistik waiting list">
        <StatCard
          label="Aktif"
          value={active.length}
          hint="On Proses & Waiting"
          tone="primary"
          icon="⚡"
          to="/admin/waiting-list"
        />
        <StatCard
          label="Revisi"
          value={revisi.length}
          hint="Perlu perbaikan ulang"
          tone="warning"
          icon="🔁"
          to="/admin/waiting-list?tab=revisi"
        />
        <StatCard
          label="Pending"
          value={pending.length}
          hint="Menunggu tindak lanjut"
          tone="muted"
          icon="⏸️"
          to="/admin/waiting-list?tab=pending"
        />
        <StatCard
          label="Selesai"
          value={done.length}
          hint="Arsip request selesai"
          tone="success"
          icon="✅"
          to="/admin/waiting-list?tab=done"
        />
        <StatCard
          label="Urgent"
          value={urgent.length}
          hint="Prioritas tertinggi"
          tone="danger"
          icon="🚨"
          to="/admin/waiting-list"
        />
        <StatCard
          label="Terlambat"
          value={overdue.length}
          hint="Melewati estimasi selesai"
          tone="danger"
          icon="⏰"
          to="/admin/waiting-list"
        />
      </section>

      <div className="dashboard-grid">
        <article className="panel panel-span-2">
          <div className="panel-head">
            <div>
              <h3>Perlu Perhatian</h3>
              <p>Request terlambat dan prioritas Urgent yang belum selesai.</p>
            </div>
            <Link to="/admin/waiting-list" className="panel-link">
              Lihat semua
            </Link>
          </div>

          {attention.length === 0 ? (
            <EmptyList>Tidak ada request yang perlu perhatian. 🎉</EmptyList>
          ) : (
            <ul className="dash-list">
              {attention.map((item) => {
                const overdueDays = getOverdueDays(item);
                const picLabel = formatPicNames(item.PIC);
                return (
                  <li key={item.id}>
                    <div className="dash-list-main">
                      <Link
                        to={`/admin/waiting-list?tab=${
                          TAB_BY_STATUS[item.status] ?? 'active'
                        }`}
                      >
                        {item.nama_orang_req || 'Tanpa nama'}
                      </Link>
                      <span>
                        {item.divisi.length > 0
                          ? item.divisi.join(', ')
                          : 'Management'}
                        {picLabel ? ` · PIC ${picLabel}` : ''}
                      </span>
                    </div>
                    <div className="dash-list-meta">
                      <span
                        className={`badge ${
                          STATUS_CLASS[item.status] ?? ''
                        }`}
                      >
                        {item.status}
                      </span>
                      {overdueDays > 0 ? (
                        <span className="meta-danger">
                          Terlambat {overdueDays} hari
                        </span>
                      ) : (
                        <span className="meta-warning">Urgent</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>Jadwal Terdekat</h3>
              <p>Request yang akan mulai dikerjakan.</p>
            </div>
          </div>

          {upcoming.length === 0 ? (
            <EmptyList>Belum ada jadwal mendatang.</EmptyList>
          ) : (
            <ul className="dash-list">
              {upcoming.map((item) => (
                <li key={item.id}>
                  <div className="dash-list-main">
                    <Link
                      to={`/admin/waiting-list?tab=${
                        TAB_BY_STATUS[item.status] ?? 'active'
                      }`}
                    >
                      {item.nama_orang_req || 'Tanpa nama'}
                    </Link>
                    <span>
                      {item.PIC.length > 0
                        ? `PIC ${formatPicNames(item.PIC)}`
                        : 'Belum ada PIC'}{' '}
                      · {item.durasiHari} hari
                    </span>
                  </div>
                  <span className="date-chip">{formatDate(item.mulai)}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>Distribusi Divisi</h3>
              <p>Request berjalan per divisi.</p>
            </div>
          </div>

          {divisiRows.length === 0 ? (
            <EmptyList>Belum ada request berjalan.</EmptyList>
          ) : (
            <div className="dist-list">
              {divisiRows.map((row) => (
                <div className="dist-row" key={row.name}>
                  <div className="dist-label">
                    <span>{row.name}</span>
                    <strong>{row.count}</strong>
                  </div>
                  <div className="dist-track">
                    <div
                      className="dist-fill"
                      style={{ width: `${(row.count / maxDivisi) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>PIC per Role</h3>
              <p>Total {pics.length} PIC terdaftar.</p>
            </div>
            <Link to="/admin/pic" className="panel-link">
              Kelola
            </Link>
          </div>

          {picLoading ? (
            <EmptyList>Memuat data PIC...</EmptyList>
          ) : (
            <div className="role-summary">
              {roleRows.map((row) => (
                <div className="role-summary-item" key={row.role}>
                  <span className={`role-badge role-${row.role.toLowerCase()}`}>
                    {row.role}
                  </span>
                  <div>
                    <strong>{row.count} PIC</strong>
                    <small>{row.description}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>Request Terbaru</h3>
              <p>Update terakhir dari tim.</p>
            </div>
          </div>

          {recent.length === 0 ? (
            <EmptyList>Belum ada request.</EmptyList>
          ) : (
            <ul className="dash-list">
              {recent.map((item) => (
                <li key={item.id}>
                  <div className="dash-list-main">
                    <Link
                      to={`/admin/waiting-list?tab=${
                        TAB_BY_STATUS[item.status] ?? 'active'
                      }`}
                    >
                      {item.nama_orang_req || 'Tanpa nama'}
                    </Link>
                    <span>{formatDateTime(item.updatedAt)}</span>
                  </div>
                  <span
                    className={`badge ${STATUS_CLASS[item.status] ?? ''}`}
                  >
                    {item.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </div>
  );
}
