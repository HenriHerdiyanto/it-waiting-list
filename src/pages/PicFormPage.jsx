import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LoadingState } from '../components/Feedback';
import { useData } from '../contexts/DataContext';
import { useToastContext } from '../contexts/ToastContext';
import { PIC_ROLES, PIC_ROLE_DESCRIPTION, PIC_ROLE_DETAIL } from '../constants';
import { hasPic, picRoleClass } from '../utils/pic';

function PicFormScreen({ existing }) {
  const {
    pics,
    requests,
    picBusy,
    createPicEntry,
    updatePicEntry,
  } = useData();
  const { notify } = useToastContext();
  const navigate = useNavigate();

  const [nama, setNama] = useState(existing?.nama ?? '');
  const [role, setRole] = useState(existing?.role ?? PIC_ROLES[0]);

  const used = requests.filter((request) =>
    hasPic(request.PIC, existing?.nama),
  ).length;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (picBusy) return;

    const trimmed = nama.trim();

    if (!trimmed) {
      notify('Nama PIC wajib diisi.', 'error');
      return;
    }

    if (!PIC_ROLES.includes(role)) {
      notify('Role PIC wajib dipilih.', 'error');
      return;
    }

    const duplicate = pics.some(
      (pic) =>
        String(pic.id) !== String(existing?.id) &&
        pic.nama.trim().toLowerCase() === trimmed.toLowerCase(),
    );

    if (duplicate) {
      notify(`PIC dengan nama "${trimmed}" sudah terdaftar.`, 'error');
      return;
    }

    const result = existing
      ? await updatePicEntry(existing.id, { nama: trimmed, role })
      : await createPicEntry({ nama: trimmed, role });

    if (result) navigate('/admin/pic');
  };

  return (
    <div className="dashboard-page">
      <div className="page-head">
        <div>
          <div className="breadcrumb">
            <Link to="/admin/pic">Master PIC</Link>
            <span>/</span>
            <span>{existing ? 'Edit PIC' : 'Tambah PIC'}</span>
          </div>
          <h2>{existing ? 'Edit PIC' : 'Tambah PIC Baru'}</h2>
          <p>
            {existing
              ? `Perbarui data ${existing.nama}.`
              : 'Daftarkan programmer atau kepala divisi baru.'}
          </p>
        </div>

        <Link to="/admin/pic" className="btn btn-ghost">
          ← Kembali
        </Link>
      </div>

      <form className="card-form pic-form" onSubmit={handleSubmit}>
        <h3>{existing ? '✏️ Edit PIC' : '+ Tambah PIC Baru'}</h3>

        <section className="form-section">
          <h4>Informasi PIC</h4>

          <label className="field">
            <span>Nama PIC *</span>
            <input
              type="text"
              placeholder="Contoh: Bima"
              value={nama}
              disabled={picBusy}
              onChange={(event) => setNama(event.target.value)}
              autoFocus
            />
            <small className="hint">
              Gunakan nama yang sama dengan yang tampil di data request.
            </small>
          </label>

          <div className="field">
            <span>Role *</span>
            <div className="role-picker" role="group" aria-label="Pilih role PIC">
              {PIC_ROLES.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`role-option ${role === option ? 'is-selected' : ''}`}
                  aria-pressed={role === option}
                  disabled={picBusy}
                  onClick={() => setRole(option)}
                >
                  <span className={`role-badge ${picRoleClass(option)}`}>
                    {option}
                  </span>
                  <span>
                    <strong>{PIC_ROLE_DESCRIPTION[option]}</strong>
                    <small>{PIC_ROLE_DETAIL[option]}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {existing && used > 0 && (
            <p className="hint">
              PIC ini dipakai di <strong>{used} request</strong>. Jika nama
              diubah, nama PIC pada request tersebut akan ikut diperbarui.
            </p>
          )}
        </section>

        <div className="form-actions">
          <button type="submit" className="btn btn-success" disabled={picBusy}>
            {picBusy
              ? 'Menyimpan...'
              : existing
                ? 'Update PIC'
                : 'Simpan PIC'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate('/admin/pic')}
            disabled={picBusy}
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}

export default function PicFormPage() {
  const { id } = useParams();
  const { pics, picLoading } = useData();

  if (picLoading) return <LoadingState />;

  const existing = id
    ? pics.find((item) => String(item.id) === String(id))
    : null;

  if (id && !existing) {
    return (
      <div className="state-card">
        <h3>PIC tidak ditemukan</h3>
        <p>Data mungkin sudah dihapus atau tautannya tidak valid.</p>
        <Link to="/admin/pic" className="btn btn-primary">
          Kembali ke Master PIC
        </Link>
      </div>
    );
  }

  return <PicFormScreen key={existing?.id ?? 'new'} existing={existing} />;
}
