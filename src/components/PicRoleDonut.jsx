import { useId } from 'react';
import { PIC_ROLE_DESCRIPTION } from '../constants';
import { UNREGISTERED_ROLE } from '../utils/picStats';

const RADIUS = 72;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const ROLE_STYLES = {
  FE: { from: '#60a5fa', to: '#2563eb' },
  BE: { from: '#34d399', to: '#059669' },
  KADIV: { from: '#fbbf24', to: '#d97706' },
  DBA: { from: '#2dd4bf', to: '#0f766e' },
  'UI/UX': { from: '#f472b6', to: '#db2777' },
  [UNREGISTERED_ROLE]: { from: '#cbd5e1', to: '#64748b' },
};

const FALLBACK_STYLE = { from: '#a5b4fc', to: '#6366f1' };

function styleFor(role) {
  return ROLE_STYLES[role] ?? FALLBACK_STYLE;
}

function descriptionFor(role) {
  if (role === UNREGISTERED_ROLE) return 'Belum ada di master PIC';
  return PIC_ROLE_DESCRIPTION[role] ?? role;
}

export default function PicRoleDonut({
  data,
  total,
  activeRole = 'all',
  onSelect,
}) {
  const rawId = useId();
  const gradientId = `donut-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const visible = data.filter((item) => item.count > 0);
  const safeTotal = Math.max(1, total ?? 0);

  const segments = visible.map((item, index) => {
    const fraction = item.count / safeTotal;
    const length = fraction * CIRCUMFERENCE;
    const gap = Math.min(length * 0.18, 3.5);
    const offset = visible
      .slice(0, index)
      .reduce(
        (sum, entry) => sum + (entry.count / safeTotal) * CIRCUMFERENCE,
        0,
      );

    return {
      ...item,
      index,
      dashLength: Math.max(length - gap, 0.5),
      offset,
      percent: Math.round(fraction * 100),
      ...styleFor(item.role),
    };
  });

  return (
    <div className="pic-donut">
      <div className="pic-donut-visual">
        <svg viewBox="0 0 200 200" role="img" aria-label="Distribusi penugasan per role PIC">
          <title>Distribusi penugasan per role PIC</title>
          <defs>
            {segments.map((segment) => (
              <linearGradient
                key={segment.role}
                id={`${gradientId}-${segment.index}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={segment.from} />
                <stop offset="100%" stopColor={segment.to} />
              </linearGradient>
            ))}
          </defs>

          <circle
            className="pic-donut-track"
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            strokeWidth="20"
          />

          <g transform="rotate(-90 100 100)">
            {segments.map((segment) => (
              <circle
                key={segment.role}
                className="pic-donut-segment"
                cx="100"
                cy="100"
                r={RADIUS}
                fill="none"
                stroke={`url(#${gradientId}-${segment.index})`}
                strokeWidth="20"
                strokeLinecap="round"
                strokeDasharray={`${segment.dashLength} ${
                  CIRCUMFERENCE - segment.dashLength
                }`}
                strokeDashoffset={-segment.offset}
              >
                <title>
                  {segment.role}: {segment.count} penugasan
                </title>
              </circle>
            ))}
          </g>
        </svg>

        <div className="pic-donut-center">
          <strong>{total ?? 0}</strong>
          <span>penugasan</span>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="pic-donut-empty">Belum ada penugasan PIC pada filter ini.</p>
      ) : (
        <div className="pic-donut-legend">
          {visible.map((item) => {
            const style = styleFor(item.role);
            const percent = Math.round((item.count / safeTotal) * 100);
            const active = activeRole === item.role;

            return (
              <button
                type="button"
                key={item.role}
                className={`pic-donut-legend-item ${active ? 'is-active' : ''}`}
                onClick={() => onSelect(item.role)}
                aria-pressed={active}
                title={`Filter role ${item.role}`}
              >
                <span
                  className="pic-donut-dot"
                  style={{
                    background: `linear-gradient(135deg, ${style.from}, ${style.to})`,
                  }}
                  aria-hidden="true"
                />
                <span className="pic-donut-legend-copy">
                  <strong>{item.role}</strong>
                  <small>{descriptionFor(item.role)}</small>
                </span>
                <span className="pic-donut-legend-count">{item.count}</span>
                <span className="pic-donut-legend-percent">{percent}%</span>
              </button>
            );
          })}
        </div>
      )}

      {activeRole !== 'all' && visible.length > 0 ? (
        <p className="pic-donut-hint">
          Grafik sedang difilter ke role <strong>{activeRole}</strong>. Klik role
          yang sama untuk menampilkan semua.
        </p>
      ) : null}
    </div>
  );
}
