import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useLoad } from '../lib/useLoad.js';
import { TutorCard } from '../components/TutorCard.jsx';
import { Empty, ErrorNote, Loading } from '../components/Feedback.jsx';

const SORT_OPTIONS = [
  ['rating', 'דירוג גבוה'],
  ['reviews', 'הכי הרבה חוות דעת'],
  ['price_asc', 'מחיר: מהנמוך'],
  ['price_desc', 'מחיר: מהגבוה'],
  ['newest', 'הצטרפו לאחרונה'],
];

const FILTER_KEYS = ['q', 'subject', 'maxPrice', 'mode', 'sort'];

export default function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const { data: subjectData } = useLoad('/subjects');
  const [results, setResults] = useState({ items: [], total: 0, page: 1 });
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [draftQ, setDraftQ] = useState(params.get('q') ?? '');

  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? '']));
  const queryString = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v),
  ).toString();

  const fetchPage = (page, signal) => {
    setStatus(page === 1 ? 'loading' : 'more');
    return api(`/tutors?${queryString}&page=${page}`, { signal })
      .then((data) => {
        setResults((prev) => (page === 1 ? data : { ...data, items: [...prev.items, ...data.items] }));
        setStatus('idle');
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err);
        setStatus('error');
      });
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchPage(1, controller.signal);
    return () => controller.abort();
  }, [queryString]); // eslint-disable-line react-hooks/exhaustive-deps

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const submitSearch = (e) => {
    e.preventDefault();
    setFilter('q', draftQ.trim());
  };

  const hasFilters = FILTER_KEYS.some((k) => k !== 'sort' && filters[k]);
  const subjects = subjectData?.subjects ?? [];

  return (
    <div className="explore">
      <header className="explore__head">
        <h1 className="title title--xl">מורים פרטיים</h1>
        <form className="searchbar searchbar--compact" onSubmit={submitSearch} role="search">
          <label className="sr-only" htmlFor="explore-q">חיפוש</label>
          <input
            id="explore-q"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="חיפוש לפי שם, עיר או נושא"
          />
          <button className="btn btn--ink" type="submit">חיפוש</button>
        </form>
      </header>

      <div className="chip-row" role="group" aria-label="סינון לפי מקצוע">
        <button
          type="button"
          className={`chip ${!filters.subject ? 'is-active' : ''}`}
          onClick={() => setFilter('subject', '')}
        >
          הכול
        </button>
        {subjects.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`chip ${filters.subject === String(s.id) ? 'is-active' : ''}`}
            onClick={() => setFilter('subject', String(s.id))}
          >
            <span aria-hidden="true">{s.emoji}</span> {s.name}
          </button>
        ))}
      </div>

      <div className="explore__body">
        <aside className="filters" aria-label="סינון">
          <fieldset className="filters__group">
            <legend>סוג שיעור</legend>
            {[['', 'הכול'], ['online', 'אונליין'], ['in_person', 'פרונטלי']].map(([value, label]) => (
              <label key={value} className="radio">
                <input
                  type="radio"
                  name="mode"
                  checked={filters.mode === value}
                  onChange={() => setFilter('mode', value)}
                />
                {label}
              </label>
            ))}
          </fieldset>

          <fieldset className="filters__group">
            <legend>מחיר מקסימלי לשעה</legend>
            <input
              type="range"
              min="80"
              max="300"
              step="10"
              value={filters.maxPrice || 300}
              onChange={(e) => setFilter('maxPrice', e.target.value === '300' ? '' : e.target.value)}
              aria-valuetext={filters.maxPrice ? `עד ${filters.maxPrice} ש״ח` : 'ללא הגבלה'}
            />
            <span className="filters__value">{filters.maxPrice ? `עד ₪${filters.maxPrice}` : 'ללא הגבלה'}</span>
          </fieldset>

          <fieldset className="filters__group">
            <legend>מיון</legend>
            <select value={filters.sort || 'rating'} onChange={(e) => setFilter('sort', e.target.value)}>
              {SORT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </fieldset>

          {hasFilters && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setDraftQ('');
                setParams({}, { replace: true });
              }}
            >
              ניקוי סינונים
            </button>
          )}
        </aside>

        <section className="explore__results" aria-live="polite">
          {status === 'loading' && <Loading label="מחפשים מורים…" />}
          {status === 'error' && <ErrorNote error={error} onRetry={() => fetchPage(1)} />}
          {status !== 'loading' && status !== 'error' && (
            <>
              <p className="muted">{results.total} מורים נמצאו</p>
              {results.items.length === 0 ? (
                <Empty title="לא מצאנו מורים שמתאימים לחיפוש">
                  נסו להרחיב את טווח המחיר או לבחור מקצוע אחר.
                </Empty>
              ) : (
                <div className="card-grid card-grid--two">
                  {results.items.map((t) => <TutorCard key={t.id} tutor={t} />)}
                </div>
              )}
              {results.items.length < results.total && (
                <button
                  type="button"
                  className="btn btn--ghost btn--block"
                  disabled={status === 'more'}
                  onClick={() => fetchPage(results.page + 1)}
                >
                  {status === 'more' ? 'טוען…' : 'עוד מורים'}
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
