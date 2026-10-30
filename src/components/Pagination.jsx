import { ITEMS_PER_PAGE_OPTIONS } from '../constants';

export default function Pagination({
  page,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) {
  if (totalItems === 0) return null;

  const start = (page - 1) * itemsPerPage + 1;
  const end = Math.min(page * itemsPerPage, totalItems);

  return (
    <div className="pagination">
      <div className="pagination-info">
        Menampilkan <strong>{start}</strong>–<strong>{end}</strong> dari{' '}
        <strong>{totalItems}</strong> request
      </div>

      <div className="pagination-controls">
        <button
          type="button"
          className="btn-page"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          &laquo; Prev
        </button>

        <span className="page-info">
          Halaman <strong>{page}</strong> dari {totalPages}
        </span>

        <button
          type="button"
          className="btn-page"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next &raquo;
        </button>
      </div>

      <label className="per-page">
        Baris:
        <select
          value={itemsPerPage}
          onChange={(event) => onItemsPerPageChange(Number(event.target.value))}
        >
          {ITEMS_PER_PAGE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
