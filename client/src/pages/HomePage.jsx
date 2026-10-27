import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLoad } from '../lib/useLoad.js';
import { TutorCard } from '../components/TutorCard.jsx';

const STEPS = [
  ['מחפשים', 'מסננים לפי מקצוע, מחיר וסוג שיעור, וקוראים חוות דעת של תלמידים אמיתיים.'],
  ['בוחרים שעה', 'רואים את היומן הפנוי של המורה ושולחים בקשה בלחיצה. בלי טלפונים ובלי התכתבויות.'],
  ['לומדים', 'המורה מאשר/ת, מקבלים עדכון בזמן אמת, ואחרי השיעור משאירים דירוג.'],
];

export default function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');
  const { data: subjectData } = useLoad('/subjects');
  const { data: featured } = useLoad('/tutors?sort=rating');
  const subjects = subjectData?.subjects ?? [];

  const search = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (subject) params.set('subject', subject);
    navigate(`/tutors?${params}`);
  };

  return (
    <>
      <section className="hero">
        <div className="hero__text">
          <p className="eyebrow">שיעורים פרטיים, בלי הבלגן</p>
          <h1 className="display">
            המורה הנכון/ה
            <br />
            <mark className="marker">במרחק שעה אחת.</mark>
          </h1>
          <p className="lede">
            מורים מומלצים במתמטיקה, אנגלית, תכנות ומוזיקה. רואים זמינות אמיתית, מזמינים שיעור
            ומדברים עם המורה, הכול באותו מקום.
          </p>

          <form className="searchbar" onSubmit={search} role="search">
            <label className="sr-only" htmlFor="hero-q">חיפוש חופשי</label>
            <input
              id="hero-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="שם מורה, עיר או נושא…"
            />
            <label className="sr-only" htmlFor="hero-subject">מקצוע</label>
            <select id="hero-subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">כל המקצועות</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button className="btn btn--accent" type="submit">חיפוש</button>
          </form>
        </div>

        <aside className="hero__card" aria-hidden="true">
          <div className="ticket">
            <span className="ticket__label">השיעור הבא</span>
            <strong className="ticket__title">חקירת פונקציות</strong>
            <span className="ticket__row"><b>יום שלישי</b> 17:00–18:00</span>
            <span className="ticket__row">אונליין · ₪160</span>
            <span className="ticket__stamp">מאושר</span>
          </div>
          <div className="ticket ticket--back">
            <span className="ticket__label">הודעה חדשה</span>
            <span className="ticket__row">״תביאי איתך את המבחן האחרון 👍״</span>
          </div>
        </aside>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="title">מה לומדים היום?</h2>
          <Link to="/tutors" className="link-arrow">לכל המורים</Link>
        </div>
        <ul className="subject-grid">
          {subjects.map((s, i) => (
            <li key={s.id}>
              <Link to={`/tutors?subject=${s.id}`} className="subject-tile" style={{ '--tilt': `${(i % 3) - 1}deg` }}>
                <span className="subject-tile__emoji" aria-hidden="true">{s.emoji}</span>
                <span className="subject-tile__name">{s.name}</span>
                <span className="subject-tile__count">
                  {s.tutorCount ? `${s.tutorCount} מורים` : 'בקרוב'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section section--band">
        <h2 className="title">איך זה עובד</h2>
        <ol className="steps">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="step">
              <span className="step__num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {featured?.items?.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2 className="title">הכי מדורגים החודש</h2>
            <Link to="/tutors?sort=rating" className="link-arrow">עוד מורים</Link>
          </div>
          <div className="card-grid">
            {featured.items.slice(0, 3).map((t) => <TutorCard key={t.id} tutor={t} />)}
          </div>
        </section>
      )}

      <section className="cta">
        <div>
          <h2 className="title">מלמדים? בואו ללמד אצלנו.</h2>
          <p>פותחים פרופיל בחינם, מסמנים שעות פנויות ומקבלים בקשות לשיעורים ישר ליומן.</p>
        </div>
        <Link to="/register?role=tutor" className="btn btn--accent btn--lg">פתיחת פרופיל מורה</Link>
      </section>
    </>
  );
}
