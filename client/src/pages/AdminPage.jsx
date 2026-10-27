import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useLoad } from '../lib/useLoad.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotice } from '../context/NoticeContext.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { ErrorNote, Loading } from '../components/Feedback.jsx';
import { fmtShortDate } from '../lib/format.js';

export default function AdminPage() {
  const overview = useLoad('/admin/overview');
  const o = overview.data;

  return (
    <div className="admin">
      <h1 className="title title--xl">ניהול המערכת</h1>
      {o && (
        <dl className="stat-row">
          <div className="stat"><dt>תלמידים</dt><dd>{o.students}</dd></div>
          <div className="stat"><dt>מורים (מפורסמים)</dt><dd>{o.tutors} <small>({o.publishedTutors})</small></dd></div>
          <div className="stat"><dt>שיעורים · השבוע</dt><dd>{o.lessons} <small>· {o.lessonsThisWeek}</small></dd></div>
          <div className="stat"><dt>דירוג ממוצע</dt><dd>{o.avgRating.toFixed(1)}★</dd></div>
        </dl>
      )}
      <UsersPanel />
      <SubjectsPanel />
    </div>
  );
}

function UsersPanel() {
  const { user: me } = useAuth();
  const notice = useNotice();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const { data, error, loading, setData } = useLoad(`/admin/users?q=${encodeURIComponent(query)}`);

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const update = async (id, body) => {
    try {
      const { user } = await api(`/admin/users/${id}`, { method: 'PATCH', body });
      setData((d) => ({ users: d.users.map((u) => (u.id === id ? user : u)) }));
      notice('המשתמש עודכן');
    } catch (err) {
      notice(err.message, 'error');
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`למחוק את ${u.fullName}? כל השיעורים וההודעות שלו/ה יימחקו.`)) return;
    try {
      await api(`/admin/users/${u.id}`, { method: 'DELETE' });
      setData((d) => ({ users: d.users.filter((x) => x.id !== u.id) }));
      notice('המשתמש נמחק');
    } catch (err) {
      notice(err.message, 'error');
    }
  };

  return (
    <section className="panel">
      <div className="panel__head">
        <h2 className="panel__title">משתמשים</h2>
        <input className="input-sm" type="search" placeholder="חיפוש לפי שם או אימייל" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {loading && !data && <Loading />}
      {error && <ErrorNote error={error} />}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>משתמש</th><th>תפקיד</th><th>הצטרפות</th><th>סטטוס</th><th><span className="sr-only">פעולות</span></th></tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id} className={u.isBlocked ? 'is-muted' : ''}>
                  <td>
                    <span className="table__user">
                      <Avatar person={u} size={30} />
                      <span><strong>{u.fullName}</strong><span className="muted small" dir="ltr">{u.email}</span></span>
                    </span>
                  </td>
                  <td>
                    <select
                      className="input-sm"
                      value={u.role}
                      disabled={u.id === me.id}
                      onChange={(e) => update(u.id, { role: e.target.value })}
                      aria-label={`תפקיד של ${u.fullName}`}
                    >
                      <option value="student">תלמיד/ה</option>
                      <option value="tutor">מורה</option>
                      <option value="admin">מנהל/ת</option>
                    </select>
                  </td>
                  <td>{fmtShortDate(u.createdAt)}</td>
                  <td><span className={`pill ${u.isBlocked ? 'pill--declined' : 'pill--confirmed'}`}>{u.isBlocked ? 'חסום' : 'פעיל'}</span></td>
                  <td className="table__actions">
                    {u.id !== me.id && (
                      <>
                        <button type="button" className="btn btn--text btn--sm" onClick={() => update(u.id, { isBlocked: !u.isBlocked })}>
                          {u.isBlocked ? 'שחרור' : 'חסימה'}
                        </button>
                        <button type="button" className="btn btn--text btn--sm btn--danger" onClick={() => remove(u)}>מחיקה</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SubjectsPanel() {
  const notice = useNotice();
  const { data, setData } = useLoad('/subjects');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');

  const add = async (e) => {
    e.preventDefault();
    try {
      const { subject } = await api('/admin/subjects', { method: 'POST', body: { name, emoji } });
      setData((d) => ({ subjects: [...d.subjects, subject] }));
      setName('');
      setEmoji('');
      notice('המקצוע נוסף');
    } catch (err) {
      notice(err.message, 'error');
    }
  };

  const remove = async (s) => {
    if (!window.confirm(`למחוק את "${s.name}"?`)) return;
    try {
      await api(`/admin/subjects/${s.id}`, { method: 'DELETE' });
      setData((d) => ({ subjects: d.subjects.filter((x) => x.id !== s.id) }));
    } catch (err) {
      notice(err.message, 'error');
    }
  };

  return (
    <section className="panel">
      <h2 className="panel__title">מקצועות</h2>
      <ul className="chip-row chip-row--wrap">
        {data?.subjects.map((s) => (
          <li key={s.id} className="chip chip--static">
            {s.emoji} {s.name} <small>({s.tutorCount})</small>
            <button type="button" className="chip__x" aria-label={`מחיקת ${s.name}`} onClick={() => remove(s)}>×</button>
          </li>
        ))}
      </ul>
      <form className="inline-form" onSubmit={add}>
        <input className="input-sm input-emoji" placeholder="🎯" value={emoji} maxLength={8} onChange={(e) => setEmoji(e.target.value)} aria-label="אימוג׳י" />
        <input className="input-sm" placeholder="שם מקצוע חדש" value={name} onChange={(e) => setName(e.target.value)} aria-label="שם מקצוע" />
        <button type="submit" className="btn btn--ink btn--sm" disabled={!name.trim()}>הוספה</button>
      </form>
    </section>
  );
}
