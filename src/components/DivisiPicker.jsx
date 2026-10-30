import { DIVISI_OPTIONS } from '../constants';

export default function DivisiPicker({ value = [], disabled = false, onChange }) {
  const selected = Array.isArray(value) ? value : [];

  const toggle = (divisi) => {
    const next = selected.includes(divisi)
      ? selected.filter((item) => item !== divisi)
      : [...selected, divisi];

    onChange(next);
  };

  return (
    <div className="divisi-picker" role="group" aria-label="Pilih divisi, boleh lebih dari satu">
      {DIVISI_OPTIONS.map((divisi) => {
        const isSelected = selected.includes(divisi);

        return (
          <button
            key={divisi}
            type="button"
            className={`chip ${isSelected ? 'is-selected' : ''}`}
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => toggle(divisi)}
          >
            {isSelected ? '✓ ' : ''}
            {divisi}
          </button>
        );
      })}
    </div>
  );
}
