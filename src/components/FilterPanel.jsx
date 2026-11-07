import {
  DIVISI_OPTIONS,
  PRIORITY_OPTIONS,
  SCHEDULE_STATUS_OPTIONS,
  SHIFTED_FILTER,
  STATUS,
  TAB_ACTIVE,
} from '../constants';

export default function FilterPanel({
  tab,
  search,
  divisi,
  status,
  prioritas,
  health,
  dateFrom,
  dateTo,
  isFiltering,
  canExport,
  onSearchChange,
  onDivisiChange,
  onStatusChange,
  onPrioritasChange,
  onHealthChange,
  onDateFromChange,
  onDateToChange,
  onReset,
  onExport,
}) {
  return (
    <div className="filter-panel">
      <input
        className="search-input"
        type="search"
        placeholder="🔍 Cari nama, deskripsi, PIC, link, lampiran, atau roadmap..."
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

        <select value={prioritas} onChange={(event) => onPrioritasChange(event.target.value)}>
          <option value="Semua">Semua Prioritas</option>
          {PRIORITY_OPTIONS.map((option) => (
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

        <select value={health} onChange={(event) => onHealthChange(event.target.value)}>
          <option value="Semua">Semua Kesehatan</option>
          {SCHEDULE_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
          <option value={SHIFTED_FILTER}>{SHIFTED_FILTER}</option>
        </select>

        <label className="date-filter">
          <span>Dari</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.target.value)}
          />
        </label>

        <label className="date-filter">
          <span>s/d</span>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => onDateToChange(event.target.value)}
          />
        </label>

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
