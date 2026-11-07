import {
  makeLinkId,
  MAX_LINKS,
  normalizeLinkUrl,
} from '../utils/links';

export default function LinksEditor({ links = [], disabled = false, onChange }) {
  const updateLink = (id, patch) => {
    onChange(links.map((link) => (link.id === id ? { ...link, ...patch } : link)));
  };

  const removeLink = (id) => {
    onChange(links.filter((link) => link.id !== id));
  };

  const addLink = () => {
    if (links.length >= MAX_LINKS) return;
    onChange([...links, { id: makeLinkId(), label: '', url: '' }]);
  };

  const handleUrlBlur = (link) => {
    const url = normalizeLinkUrl(link.url);
    if (url !== link.url) updateLink(link.id, { url });
  };

  return (
    <div className="link-editor">
      {links.length === 0 && (
        <p className="hint">
          Belum ada link tambahan. Tambahkan link Figma, spreadsheet, dokumentasi, atau
          referensi lain di sini.
        </p>
      )}

      {links.map((link) => (
        <div className="link-row" key={link.id}>
          <label className="field link-label-field">
            <span>Judul Link</span>
            <input
              type="text"
              placeholder="Contoh: Desain Figma"
              value={link.label}
              disabled={disabled}
              onChange={(event) => updateLink(link.id, { label: event.target.value })}
            />
          </label>

          <label className="field link-url-field">
            <span>URL</span>
            <input
              type="text"
              inputMode="url"
              placeholder="https://figma.com/..."
              value={link.url}
              disabled={disabled}
              onChange={(event) => updateLink(link.id, { url: event.target.value })}
              onBlur={() => handleUrlBlur(link)}
            />
          </label>

          <button
            type="button"
            className="btn-action btn-del link-remove"
            title="Hapus link"
            aria-label="Hapus link"
            disabled={disabled}
            onClick={() => removeLink(link.id)}
          >
            🗑️
          </button>
        </div>
      ))}

      <div className="link-editor-footer">
        <button
          type="button"
          className="btn btn-ghost btn-small"
          disabled={disabled || links.length >= MAX_LINKS}
          onClick={addLink}
        >
          + Tambah Link
        </button>
        <small className="hint">
          {links.length} dari {MAX_LINKS} link. Judul boleh dikosongkan.
        </small>
      </div>
    </div>
  );
}
