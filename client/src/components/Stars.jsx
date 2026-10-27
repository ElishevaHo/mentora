export function Stars({ value, count }) {
  if (!count) return <span className="stars stars--new">חדש/ה במנטורה</span>;
  return (
    <span className="stars" aria-label={`דירוג ${value} מתוך 5, ${count} חוות דעת`}>
      <span className="stars__value">{value.toFixed(1)}</span>
      <span className="stars__bar" aria-hidden="true">
        <span className="stars__fill" style={{ width: `${(value / 5) * 100}%` }} />
      </span>
      <span className="stars__count">({count})</span>
    </span>
  );
}

export function StarInput({ value, onChange }) {
  return (
    <div className="star-input" role="radiogroup" aria-label="דירוג">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} כוכבים`}
          className={n <= value ? 'is-on' : ''}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </div>
  );
}
