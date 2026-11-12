import { useState } from 'react';
import { PRIORITY } from '../constants';
import { makeLinkId } from '../utils/links';
import { parseWhatsAppRequest } from '../utils/waParser';

/**
 * Panel "Tempel dari WhatsApp": admin menempel chat WA, lalu field form
 * (nama, divisi, deskripsi, prioritas, alasan, link) diisi otomatis.
 * Semua hasil tetap bisa diedit sebelum disimpan.
 */
export default function WaPasteImport({ form, disabled = false, onApply }) {
  const [open, setOpen] = useState(true);
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);

  const apply = (requester) => {
    const parsed = parseWhatsAppRequest(text, { requester });
    setResult(parsed);
    if (!parsed.ok) return;

    const { fields } = parsed;
    const existingUrls = new Set((form.links ?? []).map((link) => link.url.toLowerCase()));
    const newLinks = fields.links
      .filter((link) => !existingUrls.has(link.url.toLowerCase()))
      .map((link) => ({ ...link, id: makeLinkId() }));

    onApply({
      nama_orang_req: fields.nama_orang_req || form.nama_orang_req,
      divisi: fields.divisi.length > 0 ? fields.divisi : form.divisi,
      deskripsi: fields.deskripsi,
      prioritas: fields.prioritas,
      alasanPrioritas: fields.alasanPrioritas || form.alasanPrioritas,
      links: [...(form.links ?? []), ...newLinks],
    });
  };

  const reset = () => {
    setText('');
    setResult(null);
  };

  return (
    <section className="wa-import">
      <button
        type="button"
        className="wa-import-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="wa-import-icon" aria-hidden="true">💬</span>
        <span className="wa-import-title">
          <strong>Tempel dari WhatsApp</strong>
          <small>Isi form otomatis dari chat requester</small>
        </span>
        <span className="wa-import-chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="wa-import-body">
          <textarea
            rows={6}
            value={text}
            disabled={disabled}
            placeholder={
              'Salin pesan dari WhatsApp (pilih pesan → Salin), lalu tempel di sini.\n' +
              'Contoh:\n[09.13, 12/11/2026] Pak Dimas: Tolong banner flash sale Aoshi diganti, segera ya'
            }
            onChange={(event) => setText(event.target.value)}
          />

          <div className="wa-import-actions">
            <button
              type="button"
              className="btn btn-primary btn-small"
              disabled={disabled || !text.trim()}
              onClick={() => apply(result?.requester)}
            >
              ✨ Isi Form Otomatis
            </button>
            {text && (
              <button type="button" className="btn btn-ghost btn-small" onClick={reset}>
                Bersihkan
              </button>
            )}
          </div>

          {result && !result.ok && <p className="form-error">{result.error}</p>}

          {result?.ok && (
            <div className="wa-import-result" role="status">
              {result.senders.length > 1 && (
                <div className="wa-import-senders">
                  <span>Requester:</span>
                  {result.senders.map(({ name, count }) => (
                    <button
                      key={name}
                      type="button"
                      className={`chip ${name === result.requester ? 'is-selected' : ''}`}
                      aria-pressed={name === result.requester}
                      onClick={() => apply(name)}
                    >
                      {name === result.requester ? '✓ ' : ''}
                      {name} ({count})
                    </button>
                  ))}
                </div>
              )}

              <ul>
                <li>
                  Nama: <strong>{result.fields.nama_orang_req || '— isi manual'}</strong>
                </li>
                <li>
                  Divisi:{' '}
                  <strong>
                    {result.fields.divisi.length > 0
                      ? result.fields.divisi.join(', ')
                      : '— tidak terdeteksi, pilih manual'}
                  </strong>
                </li>
                <li>
                  Prioritas:{' '}
                  <strong
                    className={result.fields.prioritas === PRIORITY.URGENT ? 'wa-urgent' : ''}
                  >
                    {result.fields.prioritas}
                  </strong>
                </li>
                {result.fields.links.length > 0 && (
                  <li>
                    Link ditambahkan: <strong>{result.fields.links.length}</strong>
                  </li>
                )}
                {result.tanggalPesan && (
                  <li>
                    Tanggal pesan: <strong>{result.tanggalPesan}</strong>
                  </li>
                )}
              </ul>
              <small className="hint">
                Form di bawah sudah terisi. Periksa lagi sebelum menyimpan, terutama deskripsi
                dan prioritas.
              </small>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
