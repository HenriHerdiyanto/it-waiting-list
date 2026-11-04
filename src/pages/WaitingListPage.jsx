import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RequestsExplorer from '../components/RequestsExplorer';
import ConfirmDialog from '../components/ConfirmDialog';
import RevisionDialog from '../components/RevisionDialog';
import { useData } from '../contexts/DataContext';

export default function WaitingListPage() {
  const { removeRequest, reviseRequest, busyId, saving } = useData();
  const navigate = useNavigate();

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reviseTarget, setReviseTarget] = useState(null);

  const busy = Boolean(busyId) || saving;

  const confirmDelete = async () => {
    const target = deleteTarget;
    if (!target) return;

    const ok = await removeRequest(target);
    if (ok) setDeleteTarget(null);
  };

  const handleConfirmRevise = async (deskripsiRevisi) => {
    const target = reviseTarget;
    if (!target) return;

    setReviseTarget(null);
    const ok = await reviseRequest(target, deskripsiRevisi);
    if (ok) navigate('/admin/waiting-list?tab=revisi');
  };

  return (
    <div className="dashboard-page">
      <div className="page-head">
        <div>
          <h2>Data Waiting List</h2>
          <p>
            Tambah, edit, urutkan, dan pantau seluruh request IT dari satu
            tempat.
          </p>
        </div>

        <Link to="/admin/waiting-list/new" className="btn btn-primary">
          + Tambah Request
        </Link>
      </div>

      <RequestsExplorer
        isAdmin
        onEdit={(req) => navigate(`/admin/waiting-list/${req.id}/edit`)}
        onDelete={setDeleteTarget}
        onRevise={setReviseTarget}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus request?"
        message={
          deleteTarget
            ? `Request dari "${deleteTarget.nama_orang_req}" akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
            : ''
        }
        confirmLabel="Ya, Hapus"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {reviseTarget && (
        <RevisionDialog
          key={reviseTarget.id}
          request={reviseTarget}
          busy={busy}
          onConfirm={handleConfirmRevise}
          onCancel={() => setReviseTarget(null)}
        />
      )}
    </div>
  );
}
