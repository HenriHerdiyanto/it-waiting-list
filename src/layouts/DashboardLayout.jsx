import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';

const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    hint: 'Ringkasan & statistik',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    to: '/admin/waiting-list',
    label: 'Waiting List',
    hint: 'Kelola data request',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 6h13M8 12h13M8 18h13" />
        <circle cx="3.5" cy="6" r="1.2" />
        <circle cx="3.5" cy="12" r="1.2" />
        <circle cx="3.5" cy="18" r="1.2" />
      </svg>
    ),
  },
  {
    to: '/admin/pic',
    label: 'Master PIC',
    hint: 'Programmer & kepala divisi',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 20c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" />
        <circle cx="17.5" cy="9.5" r="2.4" />
        <path d="M15.4 14.9c3 .2 5.1 2 5.1 4.6" />
      </svg>
    ),
  },
];

const PAGE_META = [  {
    match: (pathname) => pathname === '/dashboard',
    title: 'Dashboard',
    subtitle: 'Ringkasan kondisi waiting list IT hari ini.',
  },
  {
    match: (pathname) => pathname === '/admin/waiting-list',
    title: 'Data Waiting List',
    subtitle: 'Kelola, jadwalkan, dan pantau seluruh request IT.',
  },
  {
    match: (pathname) => pathname === '/admin/waiting-list/new',
    title: 'Tambah Request',
    subtitle: 'Buat request baru beserta jadwal dan roadmap.',
  },
  {
    match: (pathname) => /^\/admin\/waiting-list\/.+\/edit$/.test(pathname),
    title: 'Edit Request',
    subtitle: 'Perbarui detail, jadwal, prioritas, dan roadmap.',
  },
  {
    match: (pathname) => pathname === '/admin/pic',
    title: 'Master PIC',
    subtitle: 'Kelola daftar programmer dan kepala divisi.',
  },
  {
    match: (pathname) => pathname === '/admin/pic/new',
    title: 'Tambah PIC',
    subtitle: 'Daftarkan PIC baru ke master data.',
  },
  {
    match: (pathname) => /^\/admin\/pic\/.+\/edit$/.test(pathname),
    title: 'Edit PIC',
    subtitle: 'Perbarui nama dan role PIC.',
  },
];

function getPageMeta(pathname) {
  return (
    PAGE_META.find((item) => item.match(pathname)) ?? {
      title: 'Dashboard',
      subtitle: 'Ringkasan kondisi waiting list IT.',
    }
  );
}

const TODAY_LABEL = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date());

export default function DashboardLayout() {
  const { logout } = useAuth();
  const { notify } = useToastContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const meta = getPageMeta(location.pathname);

  const handleLogout = () => {
    logout();
    notify('Anda telah logout.', 'info');
    navigate('/login', { replace: true });
  };

  return (
    <div className={`dashboard-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div
        className="sidebar-backdrop"
        role="presentation"
        onClick={() => setSidebarOpen(false)}
      />

      <aside className="dash-sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">
            IT
          </span>
          <div>
            <strong>Waiting List</strong>
            <span>Admin Panel</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Menu admin">
          <span className="sidebar-section">Menu Utama</span>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin/waiting-list'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'is-active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-text">
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link
            to="/"
            className="sidebar-link sidebar-link-muted"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="sidebar-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 4h6v6" />
                <path d="M20 4 11 13" />
                <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
              </svg>
            </span>
            <span className="sidebar-text">
              <strong>Halaman Publik</strong>
              <small>Lihat tampilan user</small>
            </span>
          </Link>

          <button
            type="button"
            className="sidebar-link sidebar-link-danger"
            onClick={handleLogout}
          >
            <span className="sidebar-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
                <path d="M16 8l4 4-4 4" />
                <path d="M20 12H9" />
              </svg>
            </span>
            <span className="sidebar-text">
              <strong>Logout</strong>
              <small>Keluar dari admin</small>
            </span>
          </button>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-topbar">
          <button
            type="button"
            className="topbar-toggle"
            aria-label="Buka menu"
            onClick={() => setSidebarOpen((previous) => !previous)}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="topbar-heading">
            <h1>{meta.title}</h1>
            <p>{meta.subtitle}</p>
          </div>

          <div className="topbar-actions">
            <span className="topbar-date">{TODAY_LABEL}</span>
            <span className="admin-chip">
              <span className="admin-avatar" aria-hidden="true">
                A
              </span>
              <span>
                <strong>Admin</strong>
                <small>Administrator</small>
              </span>
            </span>
          </div>
        </header>

        <main className="dash-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
