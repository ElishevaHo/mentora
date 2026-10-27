import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useLoad } from '../lib/useLoad.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotice } from '../context/NoticeContext.jsx';
import { useSocketEvent } from '../context/LiveContext.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { StarInput } from '../components/Stars.jsx';
import { Empty, ErrorNote, Loading } from '../components/Feedback.jsx';
import {
  MODE_LABELS, STATUS_LABELS, fmtDayNumber, fmtLongDate, fmtMonth, fmtPrice, fmtTime,
} from '../lib/format.js';

const TABS = [
  ['upcoming', 'קרובים'],
  ['requests', 'ממתינים'],
  ['past', 'היסטוריה'],
];

function bucket(lesson) {
  if (lesson.isPast || ['declined', 'cancelled'].includes(lesson.status)) return 'past';
  return lesson.status === 'pending' ? 'requests' : 'upcoming';
}

export default function LessonsPage() {
  const { user } = useAuth();
  const { data, error, loading, reload, setData } = useLoad('/lessons');
  const [tab, setTab] = useState('upcoming');

  const replace = useCallback((lesson) => {
    setData((d) => {
      const exists = d.lessons.some((l) => l.id === lesson.id);
      return {
        lessons: exists
          ? d.lessons.map((l) => (l.id === lesson.id ? lesson : l))
          : [...d.lessons, lesson].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
      };
    });
  }, [setData]);

  useSocketEvent('lesson:changed', replace);

  if (loading) return <Loading />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;

  const groups = { upcoming: [], requests: [], past: [] };
  for (const l of data.lessons) groups[bucket(l)].push(l);
  groups.past.reverse();

  const isTutor = user.role === 'tutor';

  return (
    <div className="lessons">
      <header className="page-head">
        <h1 className="title title--xl">השיעורים שלי</h1>
        {!isTutor && <Link to="/tutors" className="btn btn--accent">הזמנת שיעור חדש</Link>}
      </header>

      <div className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            className={`tab ${tab === key ? 'is-active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
            {groups[key].length > 0 && <span className="tab__count">{groups[key].length}</span>}
          </button>
        ))}
      </div>

      {groups[tab].length === 0 ? (
        <Empty title={
          tab === 'upcoming' ? 'אין שיעורים קרובים' : tab === 'requests' ? 'אין בקשות ממתינות' : 'עוד אין היסטוריה'
        }>
          {isTutor
            ? 'בקשות חדשות מתלמידים יופיעו כאן ברגע שיישלחו.'
            : 'מצאו מורה, בחרו שעה פנויה והשיעור יופיע כאן.'}
        </Empty>
      ) : (
        <ul className="lesson-list">
          {groups[tab].map((l) => (
            <LessonRow key={l.id} lesson={l} isTutor={isTutor} onChange={replace} />
          ))}
        </ul>
      )}
    </div>
  );
}

function LessonRow({ lesson, isTutor, onChange }) {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const other = isTutor ? lesson.student : lesson.tutor;
  const done = lesson.isPast && lesson.status === 'confirmed';
  const statusKey = done ? 'done' : lesson.status;

  const act = async (action, message) => {
    setBusy(true);
    try {
      const { lesson: updated } = await api(`/lessons/${lesson.id}`, { method: 'PATCH', body: { action } });
      onChange(updated);
      notice(message);
    } catch (err) {
      notice(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={`lesson lesson--${statusKey}`}>
      <div className="lesson__date" aria-hidden="true">
        <span className="lesson__day">{fmtDayNumber(lesson.startsAt)}</span>
        <span className="lesson__month">{fmtMonth(lesson.startsAt)}</span>
      </div>

      <div className="lesson__body">
        <div className="lesson__line">
          <strong>{lesson.subject ? `${lesson.subject.emoji} ${lesson.subject.name}` : 'שיעור'}</strong>
          <span className={`pill pill--${statusKey}`}>{STATUS_LABELS[statusKey]}</span>
        </div>
        <p className="lesson__when">
          {fmtLongDate(lesson.startsAt)} · {fmtTime(lesson.startsAt)} · {MODE_LABELS[lesson.mode]} · {fmtPrice(lesson.price)}
        </p>
        <div className="lesson__who">
          <Avatar person={other} size={28} />
          {isTutor ? other.fullName : <Link to={`/tutors/${other.id}`}>{other.fullName}</Link>}
          <Link to={`/inbox/${other.id}`} className="lesson__msg">הודעה</Link>
        </div>
        {lesson.note && <p className="lesson__note">״{lesson.note}״</p>}
        {lesson.review && (
          <p className="lesson__review">
            <span aria-label={`דירגת ${lesson.review.rating} מתוך 5`}>{'★'.repeat(lesson.review.rating)}</span>
            {lesson.review.comment && ` ${lesson.review.comment}`}
          </p>
        )}
        {reviewing && (
          <ReviewForm
            lesson={lesson}
            onDone={(updated) => {
              setReviewing(false);
              onChange(updated);
            }}
          />
        )}
      </div>

      <div className="lesson__actions">
        {isTutor && lesson.status === 'pending' && !lesson.isPast && (
          <>
            <button type="button" className="btn btn--ink btn--sm" disabled={busy} onClick={() => act('confirm', 'השיעור אושר')}>אישור</button>
            <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => act('decline', 'הבקשה נדחתה')}>דחייה</button>
          </>
        )}
        {['pending', 'confirmed'].includes(lesson.status) && !lesson.isPast && (
          <button
            type="button"
            className="btn btn--text btn--sm"
            disabled={busy}
            onClick={() => window.confirm('לבטל את השיעור?') && act('cancel', 'השיעור בוטל')}
          >
            ביטול
          </button>
        )}
        {!isTutor && done && !lesson.review && !reviewing && (
          <button type="button" className="btn btn--accent btn--sm" onClick={() => setReviewing(true)}>דירוג השיעור</button>
        )}
      </div>
    </li>
  );
}

function ReviewForm({ lesson, onDone }) {
  const notice = useNotice();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { lesson: updated } = await api(`/lessons/${lesson.id}/review`, {
        method: 'POST',
        body: { rating, comment },
      });
      notice('תודה! הדירוג פורסם');
      onDone(updated);
    } catch (err) {
      notice(err.message, 'error');
      setBusy(false);
    }
  };

  return (
    <form className="review-form" onSubmit={submit}>
      <StarInput value={rating} onChange={setRating} />
      <label className="field">
        <span className="sr-only">חוות דעת</span>
        <textarea
          rows={2}
          maxLength={1000}
          placeholder="איך היה השיעור? (לא חובה)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </label>
      <button type="submit" className="btn btn--ink btn--sm" disabled={busy}>פרסום</button>
    </form>
  );
}
