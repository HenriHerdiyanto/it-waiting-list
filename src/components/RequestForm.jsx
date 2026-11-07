import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PRIORITY,
  PRIORITY_OPTIONS,
  SHIFT_POLICY,
  SHIFT_POLICY_OPTIONS,
  SHIFT_SCOPE_OPTIONS,
  STATUS,
  STATUS_OPTIONS,
} from '../constants';
import { calculateEndDate, normalizeStart } from '../utils/date';
import { balanceRoadmap, syncRoadmapDates } from '../utils/roadmap';
import { formatDate } from '../utils/format';
import DivisiPicker from './DivisiPicker';
import PicPicker from './PicPicker';
import RoadmapEditor from './RoadmapEditor';

export default function RequestForm({
  form,
  editing,
  saving,
  picOptions = [],
  onChange,
  onSubmit,
  onCancel,
}) {
  const duration = Math.max(1, Math.floor(Number(form.durasiHari) || 1));
  const isUrgent = form.prioritas === PRIORITY.URGENT;
  const [durationInput, setDurationInput] = useState(() => String(duration));
  const roadmap = Array.isArray(form.roadmap) ? form.roadmap : [];

  const applySchedule = (start, nextDuration) => {
    const end = start ? calculateEndDate(start, nextDuration) : '';

    onChange('mulai', start);
    onChange('durasiHari', nextDuration);
    onChange('estimasiSelesai', end);
  };

  const handleStartChange = (value) => {
    const start = normalizeStart(value) ?? '';

    applySchedule(start, duration);

    if (roadmap.length > 0) {
      onChange('roadmap', syncRoadmapDates(roadmap, start));
    }
  };

  const commitDuration = (value) => {
    const nextDuration = Math.max(1, Math.floor(Number(value) || 1));

    applySchedule(form.mulai, nextDuration);

    // Total durasi roadmap ikut disesuaikan agar tidak memicu error validasi.
    if (roadmap.length > 0) {
      onChange('roadmap', balanceRoadmap(roadmap, nextDuration, form.mulai));
    }
  };

  const handleDurationChange = (value) => {
    setDurationInput(value);

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) return;

    // Saat mengetik, cukup perbarui estimasi selesai; roadmap dirapikan saat blur.
    applySchedule(form.mulai, Math.floor(parsed));
  };

  const handleDurationBlur = () => {
    const parsed = Math.floor(Number(durationInput));
    const nextDuration = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;

    setDurationInput(String(nextDuration));
    // Selalu rapikan roadmap di akhir input, termasuk saat nilainya tidak berubah.
    commitDuration(nextDuration);
  };

  return (
    <form onSubmit={onSubmit} className="card-form">
      <h3>{editing ? '✏️ Edit Request' : '+ Tambah Request Baru'}</h3>

      <section className="form-section">
        <h4>Informasi Request</h4>

        <div className="form-grid">
          <label className="field">
            <span>Nama Requester *</span>
            <input
              type="text"
              placeholder="Nama orang yang request"
              required
              value={form.nama_orang_req}
              onChange={(event) => onChange('nama_orang_req', event.target.value)}
            />
          </label>

          <label className="field">
            <span>Status</span>
            <select value={form.status} onChange={(event) => onChange('status', event.target.value)}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            {form.status === STATUS.REVISI && (
              <small className="hint">
                Tanggal selesai sebelumnya tetap tersimpan. Tanggal/roadmap tidak diubah otomatis.
              </small>
            )}
          </label>
        </div>

        <div className="field">
          <span>Divisi</span>
          <DivisiPicker
            value={form.divisi}
            disabled={saving}
            onChange={(value) => onChange('divisi', value)}
          />
          <small className="hint">
            Bisa pilih lebih dari satu divisi. Kosongkan jika tidak ada (tampil sebagai Management).
          </small>
        </div>

        <label className="field">
          <span>Deskripsi Masalah *</span>
          <textarea
            rows={4}
            placeholder="Jelaskan masalah atau request secara detail"
            required
            value={form.deskripsi}
            onChange={(event) => onChange('deskripsi', event.target.value)}
          />
        </label>

        {form.status === STATUS.REVISI && (
          <label className="field">
            <span>Deskripsi Revisi *</span>
            <textarea
              rows={3}
              placeholder="Jelaskan kesalahan atau perbaikan yang perlu dikerjakan"
              required
              value={form.deskripsiRevisi}
              onChange={(event) => onChange('deskripsiRevisi', event.target.value)}
            />
            <small className="hint">
              Deskripsi ini yang tampil ke user selama status masih Revisi.
            </small>
          </label>
        )}

        <div className="field field-full">
          <span>PIC</span>
          <PicPicker
            value={form.PIC}
            options={picOptions}
            disabled={saving}
            onChange={(value) => onChange('PIC', value)}
          />
          <small className="hint">
            Bisa pilih lebih dari satu PIC. PIC dikelola di halaman{' '}
            <Link to="/admin/pic">Master PIC</Link>.
          </small>
        </div>

        <label className="field">
          <span>Level Prioritas</span>
          <select
            value={form.prioritas}
            onChange={(event) => onChange('prioritas', event.target.value)}
          >
            {PRIORITY_OPTIONS.map((prioritas) => (
              <option key={prioritas} value={prioritas}>
                {prioritas}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="form-section">
        <h4>Jadwal</h4>

        <div className="form-grid form-grid-3">
          <label className="field">
            <span>Tanggal Mulai</span>
            <input
              type="date"
              value={form.mulai}
              onChange={(event) => handleStartChange(event.target.value)}
            />
            <small className="hint">
              Opsional — kosongkan jika jadwal belum ditentukan. Semua tanggal bisa dipilih,
              termasuk akhir pekan.
            </small>
          </label>

          <label className="field">
            <span>Durasi (hari) *</span>
            <input
              type="number"
              min="1"
              step="1"
              value={durationInput}
              onChange={(event) => handleDurationChange(event.target.value)}
              onBlur={handleDurationBlur}
            />
            <small className="hint">
              Dihitung per hari kalender, termasuk Sabtu/Minggu dan hari libur.
            </small>
          </label>

          <label className="field">
            <span>Estimasi Selesai</span>
            <input
              type="text"
              readOnly
              disabled
              value={form.estimasiSelesai ? formatDate(form.estimasiSelesai) : '—'}
              placeholder="Otomatis"
              aria-label="Estimasi selesai dihitung otomatis"
            />
            <small className="hint">
              Otomatis dari tanggal mulai + durasi. Tidak perlu diisi manual.
            </small>
          </label>
        </div>
      </section>

      <section className="form-section">
        <h4>Prioritas &amp; Dampak Jadwal</h4>

        <div className="form-grid">
          <label className="field">
            <span>Alasan Prioritas {isUrgent ? '*' : ''}</span>
            <textarea
              rows={2}
              required={isUrgent}
              placeholder={
                isUrgent
                  ? 'Wajib diisi: kenapa request ini harus menang dari proyek lain?'
                  : 'Opsional untuk prioritas Tinggi'
              }
              value={form.alasanPrioritas}
              onChange={(event) => onChange('alasanPrioritas', event.target.value)}
            />
          </label>

          <label className="field">
            <span>Kebijakan Jadwal</span>
            <select
              value={form.kebijakanGeser}
              onChange={(event) => onChange('kebijakanGeser', event.target.value)}
            >
              {SHIFT_POLICY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small className="hint">
              Pilih <strong>paralel</strong> jika request ini tidak perlu menandai proyek lain yang bentrok.
            </small>
          </label>
        </div>

        {form.kebijakanGeser === SHIFT_POLICY.SHIFT && (
          <div className="form-grid">
            <label className="field">
              <span>Lingkup Proyek yang Diberi Keterangan</span>
              <select
                value={form.lingkupGeser}
                onChange={(event) => onChange('lingkupGeser', event.target.value)}
              >
                {SHIFT_SCOPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {isUrgent && (
                <small className="hint">
                  Preview keterangan akan muncul sebelum request Urgent disimpan.
                </small>
              )}
            </label>

            <label className="checkbox-row checkbox-row-plain">
              <input
                type="checkbox"
                checked={form.jadwalTerkunci}
                onChange={(event) => onChange('jadwalTerkunci', event.target.checked)}
              />
              <span>🔒 Kunci jadwal request ini (tidak diberi keterangan otomatis)</span>
            </label>
          </div>
        )}
      </section>

      <section className="form-section">
        <RoadmapEditor
          roadmap={form.roadmap}
          mulai={form.mulai}
          durasiHari={duration}
          disabled={saving}
          onChange={(value) => onChange('roadmap', value)}
        />
      </section>

      <div className="form-actions">
        <button
          type="submit"
          className={`btn ${editing ? 'btn-warning' : 'btn-success'}`}
          disabled={saving}
        >
          {saving ? 'Menyimpan...' : editing ? 'Update Request' : 'Simpan Request'}
        </button>

        {editing && (
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
            Batal Edit
          </button>
        )}
      </div>
    </form>
  );
}

