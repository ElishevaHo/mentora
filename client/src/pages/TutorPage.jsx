import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useLoad } from '../lib/useLoad.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotice } from '../context/NoticeContext.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { Stars } from '../components/Stars.jsx';
import { SlotPicker } from '../components/SlotPicker.jsx';
import { ErrorNote, Loading } from '../components/Feedback.jsx';
import { WEEKDAYS, fmtLongDate, fmtPrice, fmtTime, hourLabel, timeAgo } from '../lib/format.js';

export default function TutorPage() {
  const { id } = useParams();
  const { data: tutor, error, loading, reload } = useLoad(`/tutors/${id}`);

  if (loading) return <Loading />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;

  return (
    <div className="profile">
      <div className="profile__main">
        <header className="profile__head">
          <Avatar person={tutor} size={112} />
          <div>
            <p className="eyebrow">{tutor.subjects.map((s) => s.name).join(' · ')}</p>
            <h1 className="title title--xl">{tutor.fullName}</h1>
            <p className="profile__headline">{tutor.headline}</p>
            <Stars value={tutor.rating} count={tutor.reviewCount} />
          </div>
        </header>

        <dl className="facts">
          <div><dt>מחיר לשעה</dt><dd>{fmtPrice(tutor.hourlyRate)}</dd></div>
          <div><dt>ניסיון</dt><dd>{tutor.yearsExperience} שנים</dd></div>
          <div><dt>שיעורים במנטורה</dt><dd>{tutor.lessonsTaught}</dd></div>
          <div>
            <dt>איפה</dt>
            <dd>
              {[tutor.teachesOnline && 'אונליין', tutor.teachesInPerson && (tutor.city || 'פרונטלי')]
                .filter(Boolean).join(' / ')}
            </dd>
          </div>
        </dl>

        <section className="profile__section">
          <h2 className="title">קצת עליי</h2>
          <p className="prose">{tutor.bio || 'המורה עוד לא כתב/ה על עצמו/ה.'}</p>
        </section>

        <section className="profile__section">
          <h2 className="title">שעות קבועות בשבוע</h2>
          <ul className="week">
            {WEEKDAYS.map((name, weekday) => {
              const ranges = tutor.availability.filter((a) => a.weekday === weekday);
              return (
                <li key={name} className={ranges.length ? '' : 'is-off'}>
                  <span>{name}</span>
                  <span>
                    {ranges.length
                      ? ranges.map((r) => `${hourLabel(r.startHour)}–${hourLabel(r.endHour)}`).join(', ')
                      : 'לא זמין/ה'}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="profile__section">
          <h2 className="title">מה אומרים התלמידים</h2>
          {tutor.reviews.length === 0 ? (
            <p className="muted">עוד אין חוות דעת. אולי את/ה הראשון/ה?</p>
          ) : (
            <ul className="reviews">
              {tutor.reviews.map((r) => (
                <li key={r.id} className="review">
                  <div className="review__head">
                    <Avatar person={r.student} size={36} />
                    <div>
                      <strong>{r.student.fullName}</strong>
                      <span className="muted small">
                        {r.subject && `${r.subject} · `}{timeAgo(r.createdAt)}
                      </span>
                    </div>
                    <span className="review__rating" aria-label={`${r.rating} מתוך 5`}>
                      {'★'.repeat(r.rating)}<span className="dim">{'★'.repeat(5 - r.rating)}</span>
                    </span>
                  </div>
                  {r.comment && <p>{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <BookingPanel tutor={tutor} />
    </div>
  );
}

function BookingPanel({ tutor }) {
  const { user } = useAuth();
  const notice = useNotice();
  const navigate = useNavigate();
  const { data, reload: reloadSlots } = useLoad(`/tutors/${tutor.id}/slots?days=14`);
  const [day, setDay] = useState(null);
  const [slot, setSlot] = useState(null);
  const [subjectId, setSubjectId] = useState(tutor.subjects[0]?.id ?? '');
  const [mode, setMode] = useState(tutor.teachesOnline ? 'online' : 'in_person');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => setSlot(null), [day]);

  const isSelf = user?.id === tutor.id;
  const canBook = user?.role === 'student';

  const book = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api('/lessons', {
        method: 'POST',
        body: { tutorId: tutor.id, subjectId: Number(subjectId), startsAt: slot, mode, note },
      });
      notice('הבקשה נשלחה! נעדכן אותך כשהמורה יאשר/תאשר');
      navigate('/lessons');
    } catch (err) {
      notice(err.message, 'error');
      if (err.status === 409) {
        setSlot(null);
        reloadSlots();
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <aside className="booking">
      <div className="booking__card">
        <div className="booking__price">
          <strong>{fmtPrice(tutor.hourlyRate)}</strong> <span>/ שיעור של שעה</span>
        </div>

        {isSelf ? (
          <p className="muted">ככה התלמידים רואים את הפרופיל שלך.</p>
        ) : (
          <form onSubmit={book} className="stack">
            <h2 className="booking__title">בחירת מועד</h2>
            <SlotPicker
              slots={data?.slots ?? []}
              selectedDay={day}
              onSelectDay={setDay}
              selectedSlot={slot}
              onSelectSlot={setSlot}
            />

            {slot && (
              <>
                <p className="booking__summary">
                  {fmtLongDate(slot)}, {fmtTime(slot)}
                </p>
                <label className="field">
                  <span>מקצוע</span>
                  <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                    {tutor.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
                {tutor.teachesOnline && tutor.teachesInPerson && (
                  <div className="segmented" role="radiogroup" aria-label="סוג שיעור">
                    {[['online', 'אונליין'], ['in_person', 'פרונטלי']].map(([v, l]) => (
                      <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={mode === v}
                        className={mode === v ? 'is-active' : ''}
                        onClick={() => setMode(v)}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                )}
                <label className="field">
                  <span>משהו שכדאי שהמורה ידע/תדע? (לא חובה)</span>
                  <textarea rows={3} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
                </label>
              </>
            )}

            {!user && (
              <Link to="/login" state={{ from: `/tutors/${tutor.id}` }} className="btn btn--accent btn--block">
                התחברו כדי להזמין שיעור
              </Link>
            )}
            {user && !canBook && (
              <p className="muted small">רק חשבונות של תלמידים יכולים להזמין שיעורים.</p>
            )}
            {canBook && (
              <button type="submit" className="btn btn--accent btn--block" disabled={!slot || sending}>
                {sending ? 'שולחים…' : slot ? 'שליחת בקשה לשיעור' : 'בחרו שעה'}
              </button>
            )}
          </form>
        )}

        {user && !isSelf && (
          <Link to={`/inbox/${tutor.id}`} className="btn btn--ghost btn--block">
            שליחת הודעה ל{tutor.fullName.split(' ')[0]}
          </Link>
        )}
      </div>
    </aside>
  );
}
