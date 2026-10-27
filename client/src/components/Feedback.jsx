export function Loading({ label = 'טוען…' }) {
  return (
    <div className="loading" role="status">
      <span className="loading__dots" aria-hidden="true"><i /><i /><i /></span>
      {label}
    </div>
  );
}

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorNote({ error, onRetry }) {
  return (
    <div className="error-note" role="alert">
      <p>{error?.message ?? 'משהו השתבש'}</p>
      {onRetry && <button type="button" className="btn btn--ghost" onClick={onRetry}>נסו שוב</button>}
    </div>
  );
}
