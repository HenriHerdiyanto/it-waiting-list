import { PIC_ROLES, PIC_ROLE_DESCRIPTION } from '../constants';
import { normalizePicNames, picRoleClass } from '../utils/pic';

export default function PicPicker({
  value = [],
  options = [],
  disabled = false,
  onChange,
}) {
  const selected = normalizePicNames(value);
  const selectedKeys = new Set(selected.map((nama) => nama.toLowerCase()));
  const knownKeys = new Set(
    options
      .map((pic) => String(pic.nama ?? '').trim().toLowerCase())
      .filter(Boolean),
  );
  const legacyNames = selected.filter(
    (nama) => !knownKeys.has(nama.toLowerCase()),
  );

  const toggle = (nama) => {
    const key = nama.toLowerCase();
    const next = selectedKeys.has(key)
      ? selected.filter((entry) => entry.toLowerCase() !== key)
      : [...selected, nama];

    onChange(next);
  };

  const renderOption = (nama, role) => {
    const checked = selectedKeys.has(nama.toLowerCase());

    return (
      <label
        key={`${role ?? 'legacy'}-${nama}`}
        className={`pic-option ${checked ? 'is-selected' : ''}`}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={() => toggle(nama)}
        />
        <span className="pic-option-text">
          <strong>{nama}</strong>
          {role ? (
            <span className={`role-badge ${picRoleClass(role)}`}>{role}</span>
          ) : (
            <span className="pic-option-note">data lama</span>
          )}
        </span>
      </label>
    );
  };

  return (
    <div
      className="pic-picker"
      role="group"
      aria-label="Pilih PIC, boleh lebih dari satu"
    >
      <div className="pic-picker-head">
        <span
          className={`pic-selected-count ${
            selected.length > 0 ? 'has-selection' : ''
          }`}
        >
          {selected.length > 0
            ? `${selected.length} PIC dipilih`
            : 'Belum ada PIC dipilih'}
        </span>
        {selected.length > 0 && (
          <button
            type="button"
            className="pic-clear"
            disabled={disabled}
            onClick={() => onChange([])}
          >
            Kosongkan
          </button>
        )}
      </div>

      <div className="pic-groups">
        {PIC_ROLES.map((role) => {
          const items = options.filter((pic) => pic.role === role);
          if (items.length === 0) return null;

          return (
            <fieldset className="pic-group" key={role} disabled={disabled}>
              <legend>
                <span className={`role-badge ${picRoleClass(role)}`}>{role}</span>
                {PIC_ROLE_DESCRIPTION[role]}
              </legend>
              <div className="pic-options">
                {items.map((pic) => renderOption(pic.nama, role))}
              </div>
            </fieldset>
          );
        })}

        {options.some((pic) => !PIC_ROLES.includes(pic.role)) && (
          <fieldset
            className="pic-group"
            disabled={disabled}
            aria-label="PIC dengan role lainnya"
          >
            <legend>Lainnya</legend>
            <div className="pic-options">
              {options
                .filter((pic) => !PIC_ROLES.includes(pic.role))
                .map((pic) => renderOption(pic.nama, pic.role))}
            </div>
          </fieldset>
        )}
      </div>

      {legacyNames.length > 0 && (
        <fieldset className="pic-group pic-group-legacy">
          <legend>Data lama</legend>
          <div className="pic-options">
            {legacyNames.map((nama) => renderOption(nama))}
          </div>
          <small className="hint">
            PIC ini belum terdaftar di Master PIC. Tetap tersimpan sampai kamu
            mengubah pilihannya.
          </small>
        </fieldset>
      )}

      {options.length === 0 && legacyNames.length === 0 && (
        <p className="pic-empty">
          Belum ada PIC di master data. Tambahkan PIC terlebih dahulu di halaman
          Master PIC.
        </p>
      )}
    </div>
  );
}
