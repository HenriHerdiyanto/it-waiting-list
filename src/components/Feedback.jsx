export function LoadingState() {
  return (
    <div className="state-card" aria-busy="true" aria-live="polite">
      <div className="skeleton-row" />
      <div className="skeleton-row" />
      <div className="skeleton-row" />
      <span className="sr-only">Memuat data...</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-card state-error" role="alert">
      <h3>Gagal memuat data</h3>
      <p>{message}</p>
      <button type="button" className="btn btn-primary" onClick={onRetry}>
        Coba Lagi
      </button>
    </div>
  );
}
