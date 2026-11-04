import { Link } from 'react-router-dom';

export default function StatCard({
  label,
  value,
  hint,
  tone = 'primary',
  icon = '📌',
  to,
}) {
  const content = (
    <>
      <div className={`stat-icon tone-${tone}`} aria-hidden="true">
        {icon}
      </div>
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        {hint && <span className="stat-hint">{hint}</span>}
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`stat-card tone-${tone}`}>
        {content}
      </Link>
    );
  }

  return <div className={`stat-card tone-${tone}`}>{content}</div>;
}
