import { DIVISI_OPTIONS, STATUS, TAB_ACTIVE } from '../constants';

export default function FilterPanel({
  tab,
  search,
  divisi,
  status,
  isFiltering,
  canExport,
  onSearchChange,
  onDivisiChange,
  onStatusChange,
  onReset,
  onExport,
}) {
  return (
    <div className="filter-panel">
      <input
        className="search-input"
        type="search"
        placeholder="🔍 Cari nama, deskripsi, atau PIC..."
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />

      <div className="filter-dropdowns">
        <select value={divisi} onChange={(event) => onDivisiChange(event.target.value)}>
          <option value="Semua">Semua Divisi</option>
          {DIVISI_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        {tab === TAB_ACTIVE && (
          <select value={status} onChange={(event) => onStatusChange(event.target.value)}>
            <option value="Semua">Semua Status</option>
            <option value={STATUS.ON_PROGRESS}>{STATUS.ON_PROGRESS}</option>
            <option value={STATUS.WAITING}>{STATUS.WAITING}</option>
          </select>
        )}

        {isFiltering && (
          <button type="button" className="btn btn-ghost" onClick={onReset}>
            Reset
          </button>
        )}

        <button type="button" className="btn btn-outline" onClick={onExport} disabled={!canExport}>
          ⬇️ Export CSV
        </button>
      </div>
    </div>
  );
}
