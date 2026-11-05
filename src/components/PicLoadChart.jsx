import { STATUS } from '../constants';
import { picRoleClass } from '../utils/pic';
import { STATUS_CHART_ORDER } from '../utils/picStats';
import PicAvatar from './PicAvatar';

const STATUS_META = {
  [STATUS.WAITING]: { label: 'Waiting', className: 'is-waiting' },
  [STATUS.ON_PROGRESS]: { label: 'On Proses', className: 'is-proses' },
  [STATUS.REVISI]: { label: 'Revisi', className: 'is-revisi' },
  [STATUS.PENDING]: { label: 'Pending', className: 'is-pending' },
  [STATUS.DONE]: { label: 'Done', className: 'is-done' },
};

function breakdownLabel(row) {
  const parts = STATUS_CHART_ORDER.filter((status) => (row.counts[status] ?? 0) > 0).map(
    (status) => `${STATUS_META[status].label} ${row.counts[status]}`,
  );

  return parts.length > 0 ? parts.join(', ') : 'belum ada request';
}

export default function PicLoadChart({
  rows,
  selectedKey,
  onSelect,
  emptyMessage = 'Belum ada PIC yang cocok dengan filter ini.',
}) {
  const maxTotal = Math.max(1, ...rows.map((row) => row.total));

  return (
    <div className="pic-load-chart">
      <div className="pic-chart-legend" aria-label="Keterangan status request">
        {STATUS_CHART_ORDER.map((status) => (
          <span className="pic-chart-legend-item" key={status}>
            <i className={`pic-chart-dot ${STATUS_META[status].className}`} />
            {STATUS_META[status].label}
          </span>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="pic-chart-empty">
          <span aria-hidden="true">📊</span>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="pic-chart-rows">
          {rows.map((row, index) => {
            const width = row.total > 0 ? (row.total / maxTotal) * 100 : 0;
            const rankLabel = row.isUnassigned ? '!' : index + 1;
            const isTopThree = !row.isUnassigned && index < 3 && row.total > 0;
            const selected = selectedKey === row.key;

            return (
              <button
                type="button"
                key={row.key}
                className={`pic-chart-row ${selected ? 'is-selected' : ''} ${
                  row.isUnassigned ? 'is-unassigned' : ''
                }`}
                onClick={() => onSelect(row.key)}
                aria-pressed={selected}
                aria-label={`${row.nama}, ${row.total} request: ${breakdownLabel(row)}`}
                title={breakdownLabel(row)}
              >
                <span
                  className={`pic-chart-rank ${
                    isTopThree ? `is-rank-${index + 1}` : ''
                  }`}
                  aria-hidden="true"
                >
                  {rankLabel}
                </span>

                <span className="pic-chart-person">
                  <PicAvatar
                    name={row.nama}
                    muted={row.isUnassigned}
                    size="sm"
                  />
                  <span className="pic-chart-identity">
                    <strong>{row.nama}</strong>
                    <span
                      className={`role-badge pic-chart-role ${picRoleClass(
                        row.role,
                      )}`}
                    >
                      {row.role}
                    </span>
                  </span>
                </span>

                <span className="pic-chart-bar-area">
                  <span className="pic-chart-track">
                    <span
                      className="pic-chart-fill"
                      style={{
                        '--bar-width': `${width}%`,
                        '--row-index': index,
                      }}
                    >
                      {STATUS_CHART_ORDER.map((status) => {
                        const count = row.counts[status] ?? 0;
                        if (count === 0 || row.total === 0) return null;

                        return (
                          <span
                            key={status}
                            className={`pic-bar-segment ${STATUS_META[status].className}`}
                            style={{ width: `${(count / row.total) * 100}%` }}
                          >
                            <span className="pic-bar-tooltip">
                              {STATUS_META[status].label}: {count}
                            </span>
                          </span>
                        );
                      })}
                    </span>
                  </span>
                </span>

                <span className="pic-chart-total">
                  <strong>{row.total}</strong>
                  <small>request</small>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
