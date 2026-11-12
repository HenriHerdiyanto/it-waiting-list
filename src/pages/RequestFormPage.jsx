import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import RequestForm from '../components/RequestForm';
import WaPasteImport from '../components/WaPasteImport';
import ShiftImpactDialog from '../components/ShiftImpactDialog';
import { ErrorState, LoadingState } from '../components/Feedback';
import { useData } from '../contexts/DataContext';
import { useToastContext } from '../contexts/ToastContext';
import { TAB_ACTIVE, TAB_BY_STATUS } from '../constants';
import {
  buildRequestPayload,
  formFromRequest,
  validateRequestPayload,
} from '../utils/requestPayload';
import { uploadFiles } from '../services/uploadStore';

function NotFound() {
  return (
    <div className="state-card">
      <h3>Request tidak ditemukan</h3>
      <p>Data mungkin sudah dihapus atau tautannya tidak valid.</p>
      <Link to="/admin/waiting-list" className="btn btn-primary">
        Kembali ke Waiting List
      </Link>
    </div>
  );
}

function RequestFormScreen({ existing }) {
  const { requests, pics, saving, submitRequest, completeShift } = useData();
  const { notify } = useToastContext();
  const navigate = useNavigate();

  const [form, setForm] = useState(() => formFromRequest(existing));
  const [shiftPreview, setShiftPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleApplyFromWa = (fields) => {
    setForm((previous) => ({ ...previous, ...fields }));
    notify('Form terisi dari chat WhatsApp. Periksa lagi sebelum menyimpan.', 'success');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving || uploading) return;

    let workingForm = form;
    let payload = buildRequestPayload(workingForm, existing);
    const error = validateRequestPayload(payload);

    if (error) {
      notify(error, 'error');
      return;
    }

    const pendingFiles = Array.isArray(form.pendingFiles) ? form.pendingFiles : [];

    if (pendingFiles.length > 0) {
      setUploading(true);

      try {
        const uploaded = await uploadFiles(pendingFiles);
        workingForm = {
          ...form,
          attachments: [...(form.attachments ?? []), ...uploaded],
          pendingFiles: [],
        };
        setForm(workingForm);
      } catch (uploadError) {
        notify(uploadError.message || 'Gagal mengunggah file.', 'error');
        return;
      } finally {
        setUploading(false);
      }
    }

    payload = buildRequestPayload(workingForm, existing);
    const finalError = validateRequestPayload(payload);

    if (finalError) {
      notify(finalError, 'error');
      return;
    }

    const targetTab = TAB_BY_STATUS[payload.status] ?? TAB_ACTIVE;
    const result = await submitRequest({
      payload,
      existing,
      targetTab,
      message: existing
        ? 'Request berhasil diperbarui.'
        : 'Request baru berhasil ditambahkan.',
    });

    if (result.preview) {
      setShiftPreview(result.preview);
      return;
    }

    if (result.saved) {
      navigate(`/admin/waiting-list?tab=${targetTab}`);
    }
  };

  const handleConfirmShift = async ({ selectedIds }) => {
    const preview = shiftPreview;
    if (!preview) return;

    setShiftPreview(null);
    const ok = await completeShift(preview, selectedIds);

    if (ok) {
      navigate(`/admin/waiting-list?tab=${preview.targetTab ?? TAB_ACTIVE}`);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="page-head">
        <div>
          <div className="breadcrumb">
            <Link to="/admin/waiting-list">Waiting List</Link>
            <span>/</span>
            <span>{existing ? 'Edit Request' : 'Tambah Request'}</span>
          </div>
          <h2>{existing ? 'Edit Request' : 'Tambah Request Baru'}</h2>
          <p>
            {existing
              ? `Perbarui data request dari ${existing.nama_orang_req}.`
              : 'Lengkapi informasi request, jadwal, prioritas, dan roadmap.'}
          </p>
        </div>

        <Link to="/admin/waiting-list" className="btn btn-ghost">
          ← Kembali
        </Link>
      </div>

      {!existing && (
        <WaPasteImport form={form} disabled={saving || uploading} onApply={handleApplyFromWa} />
      )}

      <RequestForm
        key={existing?.id ?? 'new'}
        form={form}
        editing={Boolean(existing)}
        saving={saving || uploading}
        uploading={uploading}
        picOptions={pics}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/admin/waiting-list')}
      />

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
    </div>
  );
}

export default function RequestFormPage() {
  const { id } = useParams();
  const { requests, loading, loadError, retryLoad } = useData();

  if (loading) return <LoadingState />;
  if (loadError) return <ErrorState message={loadError} onRetry={retryLoad} />;

  const existing = id
    ? requests.find((item) => String(item.id) === String(id))
    : null;

  if (id && !existing) return <NotFound />;

  return (
    <RequestFormScreen key={existing?.id ?? 'new'} existing={existing} />
  );
}
