import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import { LoadingState } from '../components/Feedback';
import { useData } from '../contexts/DataContext';
import { useToastContext } from '../contexts/ToastContext';
import { PIC_ROLES, PIC_ROLE_DESCRIPTION } from '../constants';
import { normalizePicNames, picRoleClass } from '../utils/pic';

const usageKey = (value) => String(value ?? '').trim().toLowerCase();

export default function PicListPage() {
  const {
    pics,
    picMode,
    picError,
    picLoading,
    picBusy,
    requests,
    deletePicEntry,
    importPicsFromRequests,
  } = useData();
  const { notify } = useToastContext();

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('Semua');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const usage = useMemo(() => {
    const map = new Map();
    requests.forEach((request) => {
      normalizePicNames(request.PIC).forEach((nama) => {
        const key = usageKey(nama);
        if (!key) return;
        map.set(key, (map.get(key) ?? 0) + 1);
      });
    });
    return map;
  }, [requests]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return pics.filter((pic) => {
      if (filterRole !== 'Semua' && pic.role !== filterRole) return false;
      if (!term) return true;
      return `${pic.nama} ${pic.role}`.toLowerCase().includes(term);
    });
  }, [pics, search, filterRole]);

  const roleCounts = PIC_ROLES.map((role) => ({
    role,
    count: pics.filter((item) => item.role === role).length,
  }));

  const handleDeleteClick = (pic) => {
    const used = usage.get(usageKey(pic.nama)) ?? 0;
    if (used > 0) {
      notify(
        `PIC "${pic.nama}" masih dipakai di ${used} request. Ganti PIC pada request tersebut sebelum menghapus.`,
        'warning',
      );
      return;
    }
    setDeleteTarget(pic);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await deletePicEntry(deleteTarget.id);
    if (ok) setDeleteTarget(null);
  };

  return (
    <div className="dashboard-page">
      <div className="page-head">
        <div>
          <h2>Master PIC</h2>
          <p>
            Daftar programmer dan kepala divisi yang menangani request IT.
          </p>
        </div>

        <div className="page-actions">
          <Link to="/admin/statistik-pic" className="btn btn-outline">
            📊 Lihat Statistik
          </Link>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => importPicsFromRequests('BE')}
            disabled={picBusy}
          >
            ⬇️ Import dari Request
          </button>
          <Link to="/admin/pic/new" className="btn btn-primary">
            + Tambah PIC
          </Link>
        </div>
      </div>

      {picMode === 'local' && (
        <div className="banner banner-info" role="status">
          <span className="banner-icon" aria-hidden="true">
            💾
          </span>
          <div>
            <strong>Mode penyimpanan lokal aktif.</strong> Endpoint PIC belum
            tersedia, sehingga data disimpan di browser ini. Buat resource{' '}
            <code>pics</code> di MockAPI lalu set{' '}
            <code>VITE_PIC_API_URL</code> agar data tersinkron antar perangkat.
            {picError ? <small> Detail: {picError}</small> : null}
          </div>
        </div>
      )}

      <section className="pic-summary">
        {roleCounts.map((item) => (
          <div className="pic-summary-card" key={item.role}>
            <span className={`role-badge ${picRoleClass(item.role)}`}>
              {item.role}
            </span>
            <div>
              <strong>{item.count}</strong>
              <small>{PIC_ROLE_DESCRIPTION[item.role]}</small>
            </div>
          </div>
        ))}
        <div className="pic-summary-card">
          <span className="role-badge role-total">Σ</span>
          <div>
            <strong>{pics.length}</strong>
            <small>Total PIC</small>
          </div>
        </div>
      </section>

      <section className="panel pic-panel">
        <div className="pic-toolbar">
          <input
            type="search"
            className="search-input"
            placeholder="🔍 Cari nama atau role PIC..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="filter-dropdowns">
            <select
              value={filterRole}
              onChange={(event) => setFilterRole(event.target.value)}
            >
              <option value="Semua">Semua Role</option>
              {PIC_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role} — {PIC_ROLE_DESCRIPTION[role]}
                </option>
              ))}
            </select>
            <span className="pic-count">
              {filtered.length} dari {pics.length} PIC
            </span>
          </div>
        </div>

        {picLoading ? (
          <LoadingState />
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th scope="col">Nama</th>
                  <th scope="col">Role</th>
                  <th scope="col">Dipakai di</th>
                  <th scope="col" className="col-actions">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty-cell">
                      {pics.length === 0
                        ? 'Belum ada PIC. Tambahkan PIC baru atau import dari data request.'
                        : 'Tidak ada PIC yang cocok dengan pencarian.'}
                    </td>
                  </tr>
                )}

                {filtered.map((pic) => {
                  const used = usage.get(usageKey(pic.nama)) ?? 0;

                  return (
                    <tr key={pic.id}>
                      <td>
                        <strong>{pic.nama}</strong>
                      </td>
                      <td>
                        <span
                          className={`role-badge ${picRoleClass(pic.role)}`}
                        >
                          {pic.role}
                        </span>
                        <span className="role-desc">
                          {PIC_ROLE_DESCRIPTION[pic.role] ?? '—'}
                        </span>
                      </td>
                      <td>
                        {used > 0 ? (
                          <span className="usage-pill">{used} request</span>
                        ) : (
                          <span className="muted">Belum dipakai</span>
                        )}
                      </td>
                      <td>
                        <div className="action-row">
                          <Link
                            to={`/admin/pic/${pic.id}/edit`}
                            className="btn-action btn-edit"
                          >
                            ✏️ Edit
                          </Link>
                          <button
                            type="button"
                            className="btn-action btn-del"
                            onClick={() => handleDeleteClick(pic)}
                            disabled={picBusy}
                          >
                            🗑️ Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus PIC?"
        message={
          deleteTarget
            ? `PIC "${deleteTarget.nama}" akan dihapus dari master data. Tindakan ini tidak bisa dibatalkan.`
            : ''
        }
        confirmLabel="Ya, Hapus"
        busy={picBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
