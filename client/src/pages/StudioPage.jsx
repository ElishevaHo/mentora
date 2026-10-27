import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useLoad } from '../lib/useLoad.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotice } from '../context/NoticeContext.jsx';
import { ErrorNote, Loading } from '../components/Feedback.jsx';
import { WEEKDAYS_SHORT, fmtPrice, hourLabel } from '../lib/format.js';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00–22:00 starts

function rangesToCells(ranges) {
  const cells = new Set();
  for (const r of ranges) {
    for (let h = r.startHour; h < r.endHour; h++) cells.add(`${r.weekday}-${h}`);
  }
  return cells;
}

function cellsToRanges(cells) {
  const ranges = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    let start = null;
    for (let h = 0; h <= 24; h++) {
      const on = h < 24 && cells.has(`${weekday}-${h}`);
      if (on && start === null) start = h;
      if (!on && start !== null) {
        ranges.push({ weekday, startHour: start, endHour: h });
        start = null;
      }
    }
  }
  return ranges;
}

export default function StudioPage() {
  const { user } = useAuth();
  const studio = useLoad('/studio');
  const stats = useLoad('/studio/stats');
  const subjects = useLoad('/subjects');

  if (studio.loading || subjects.loading) return <Loading />;
  if (studio.error) return <ErrorNote error={studio.error} onRetry={studio.reload} />;

  return (
    <div className="studio">
      <header className="page-head">
        <div>
          <p className="eyebrow">הסטודיו של {user.fullName.split(' ')[0]}</p>
          <h1 className="title title--xl">הפרופיל והיומן שלך</h1>
        </div>
        {studio.data.isPublished && (
          <Link to={`/tutors/${user.id}`} className="btn btn--ghost">צפייה בפרופיל הציבורי</Link>
        )}
      </header>

      {stats.data && (
        <dl className="stat-row">
          <div className="stat"><dt>ממתינים לאישור</dt><dd>{stats.data.pending}</dd>
            {stats.data.pending > 0 && <Link to="/lessons" className="stat__link">לטיפול</Link>}
          </div>
          <div className="stat"><dt>שיעורים קרובים</dt><dd>{stats.data.upcoming}</dd></div>
          <div className="stat"><dt>הכנסה החודש</dt><dd>{fmtPrice(stats.data.earnedThisMonth)}</dd></div>
          <div className="stat"><dt>דירוג ממוצע</dt>
            <dd>{stats.data.reviewCount ? `${stats.data.rating.toFixed(1)}★` : 'אין עדיין'}</dd>
          </div>
        </dl>
      )}

      <StudioForm
        initial={studio.data}
        subjects={subjects.data?.subjects ?? []}
        onSaved={(next) => {
          studio.setData(next);
          stats.reload();
        }}
      />
    </div>
  );
}

function StudioForm({ initial, subjects, onSaved }) {
  const notice = useNotice();
  const [form, setForm] = useState(initial);
  const [cells, setCells] = useState(() => rangesToCells(initial.availability));
  const [saving, setSaving] = useState(false);
  const painting = useRef(null);

  useEffect(() => {
    const stop = () => { painting.current = null; };
    window.addEventListener('pointerup', stop);
    return () => window.removeEventListener('pointerup', stop);
  }, []);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const toggleSubject = (id) => setForm((f) => ({
    ...f,
    subjectIds: f.subjectIds.includes(id) ? f.subjectIds.filter((x) => x !== id) : [...f.subjectIds, id],
  }));

  // Click-and-drag painting across the weekly grid.
  const paint = (key, turnOn) => setCells((prev) => {
    const next = new Set(prev);
    if (turnOn) next.add(key);
    else next.delete(key);
    return next;
  });

  const save = async (e, publish = form.isPublished) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const saved = await api('/studio', {
        method: 'PUT',
        body: {
          ...form,
          isPublished: publish,
          hourlyRate: Number(form.hourlyRate),
          yearsExperience: Number(form.yearsExperience),
          availability: cellsToRanges(cells),
        },
      });
      setForm(saved);
      onSaved(saved);
      notice(publish && !initial.isPublished ? 'הפרופיל באוויר! תלמידים כבר יכולים למצוא אותך' : 'השינויים נשמרו');
    } catch (err) {
      notice(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="studio__form" onSubmit={save}>
      <div className={`publish-bar ${form.isPublished ? 'is-live' : ''}`}>
        <div>
          <strong>{form.isPublished ? 'הפרופיל מפורסם' : 'הפרופיל עדיין טיוטה'}</strong>
          <span>
            {form.isPublished
              ? 'תלמידים יכולים למצוא אותך בחיפוש ולהזמין שיעורים.'
              : 'מלאו כותרת, מקצועות ושעות פנויות, ואז פרסמו.'}
          </span>
        </div>
        <button
          type="button"
          className={`btn ${form.isPublished ? 'btn--ghost' : 'btn--accent'}`}
          disabled={saving}
          onClick={() => save(null, !form.isPublished)}
        >
          {form.isPublished ? 'הסתרת הפרופיל' : 'שמירה ופרסום'}
        </button>
      </div>

      <section className="panel">
        <h2 className="panel__title">פרטים בסיסיים</h2>
        <label className="field">
          <span>כותרת (מופיעה בכרטיס בחיפוש)</span>
          <input value={form.headline} maxLength={90} onChange={set('headline')} placeholder="למשל: מתמטיקה ל-5 יחידות, בגובה העיניים" />
        </label>
        <label className="field">
          <span>קצת עליך</span>
          <textarea rows={5} value={form.bio} maxLength={2000} onChange={set('bio')} placeholder="ניסיון, שיטת לימוד, למי השיעורים מתאימים…" />
        </label>
        <div className="field-row">
          <label className="field">
            <span>מחיר לשעה (₪)</span>
            <input type="number" min={30} max={1000} value={form.hourlyRate} onChange={set('hourlyRate')} />
          </label>
          <label className="field">
            <span>שנות ניסיון</span>
            <input type="number" min={0} max={60} value={form.yearsExperience} onChange={set('yearsExperience')} />
          </label>
          <label className="field">
            <span>עיר</span>
            <input value={form.city} maxLength={40} onChange={set('city')} />
          </label>
        </div>
        <div className="check-row">
          <label className="check"><input type="checkbox" checked={form.teachesOnline} onChange={set('teachesOnline')} /> שיעורים אונליין</label>
          <label className="check"><input type="checkbox" checked={form.teachesInPerson} onChange={set('teachesInPerson')} /> שיעורים פרונטליים</label>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel__title">מה את/ה מלמד/ת?</h2>
        <div className="chip-row chip-row--wrap">
          {subjects.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={form.subjectIds.includes(s.id)}
              className={`chip ${form.subjectIds.includes(s.id) ? 'is-active' : ''}`}
              onClick={() => toggleSubject(s.id)}
            >
              <span aria-hidden="true">{s.emoji}</span> {s.name}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel__title">שעות פנויות בשבוע</h2>
        <p className="muted small">לחצו או גררו על המשבצות. כל משבצת היא שעת שיעור אחת.</p>
        <div className="week-grid" role="grid" aria-label="זמינות שבועית">
          <div className="week-grid__corner" />
          {WEEKDAYS_SHORT.map((d) => <div key={d} className="week-grid__day" role="columnheader">{d}</div>)}
          {HOURS.map((h) => (
            <div key={h} className="week-grid__row" role="row">
              <div className="week-grid__hour" role="rowheader">{hourLabel(h)}</div>
              {WEEKDAYS_SHORT.map((d, weekday) => {
                const key = `${weekday}-${h}`;
                const on = cells.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    role="gridcell"
                    aria-pressed={on}
                    aria-label={`${d} ${hourLabel(h)}`}
                    className={`cell ${on ? 'is-on' : ''}`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      painting.current = !on;
                      paint(key, !on);
                    }}
                    onPointerEnter={() => painting.current !== null && paint(key, painting.current)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        paint(key, !on);
                      }
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <p className="muted small">{cells.size} שעות מסומנות בשבוע</p>
      </section>

      <div className="studio__save">
        <button type="submit" className="btn btn--ink btn--lg" disabled={saving}>
          {saving ? 'שומרים…' : 'שמירת שינויים'}
        </button>
      </div>
    </form>
  );
}
