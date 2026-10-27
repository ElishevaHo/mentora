import { useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotice } from '../context/NoticeContext.jsx';

const DEMO_ACCOUNTS = [
  { email: 'student@demo.com', label: 'תלמידה לדוגמה', hint: 'נועה: הזמנת שיעורים וחוות דעת' },
  { email: 'tutor@demo.com', label: 'מורה לדוגמה', hint: 'דניאל: אישור בקשות, יומן וסטטיסטיקות' },
];
const DEMO_PASSWORD = 'demo1234';

// Once signed in, both pages redirect here on the next render.
function useDestination() {
  const location = useLocation();
  return (user) => {
    const fallback = user.role === 'tutor' ? '/studio' : user.role === 'admin' ? '/admin' : '/tutors';
    return location.state?.from ?? fallback;
  };
}

function AuthFrame({ title, subtitle, children, aside }) {
  return (
    <div className="auth">
      <div className="auth__panel">
        <h1 className="title title--xl">{title}</h1>
        <p className="lede">{subtitle}</p>
        {children}
      </div>
      <div className="auth__aside">{aside}</div>
    </div>
  );
}

export function LoginPage() {
  const { user, login } = useAuth();
  const notice = useNotice();
  const destination = useDestination();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={destination(user)} replace />;

  const signIn = async (e, credentials = { email, password }) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await login(credentials.email, credentials.password);
      notice(`שלום ${u.fullName.split(' ')[0]}, טוב לראות אותך`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthFrame
      title="ברוכים השבים"
      subtitle="התחברו כדי לנהל שיעורים ולהמשיך שיחות עם המורים."
      aside={
        <div className="demo-box">
          <p className="eyebrow">רוצים רק להציץ?</p>
          <h2 className="title">כניסה בלחיצה לחשבון דמו</h2>
          <div className="stack">
            {DEMO_ACCOUNTS.map((d) => (
              <button
                key={d.email}
                type="button"
                className="demo-account"
                disabled={busy}
                onClick={() => signIn(null, { email: d.email, password: DEMO_PASSWORD })}
              >
                <strong>{d.label}</strong>
                <span>{d.hint}</span>
              </button>
            ))}
          </div>
        </div>
      }
    >
      <form className="stack" onSubmit={signIn} noValidate>
        <label className="field">
          <span>אימייל</span>
          <input type="email" dir="ltr" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>סיסמה</span>
          <input type="password" dir="ltr" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn--ink btn--block" type="submit" disabled={busy}>
          {busy ? 'מתחברים…' : 'כניסה'}
        </button>
        <p className="muted small">
          אין לך חשבון? <Link to="/register" state={location.state}>להרשמה</Link>
        </p>
      </form>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const notice = useNotice();
  const destination = useDestination();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: params.get('role') === 'tutor' ? 'tutor' : 'student',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={destination(user)} replace />;

  const set =(key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await register(form);
      notice(u.role === 'tutor' ? 'החשבון נוצר! עכשיו נמלא את הפרופיל שלך' : 'החשבון נוצר, אפשר להתחיל לחפש מורים');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthFrame
      title="פותחים חשבון"
      subtitle="לוקח פחות מדקה. בלי כרטיס אשראי."
      aside={
        <ul className="perks">
          <li><b>יומן אמיתי.</b> רואים רק שעות שבאמת פנויות.</li>
          <li><b>הודעות בזמן אמת.</b> מדברים עם המורה לפני ואחרי השיעור.</li>
          <li><b>חוות דעת מאומתות.</b> רק מי שלמד/ה יכול/ה לדרג.</li>
        </ul>
      }
    >
      <form className="stack" onSubmit={submit} noValidate>
        <div className="role-pick" role="radiogroup" aria-label="סוג חשבון">
          {[
            ['student', 'אני רוצה ללמוד', 'מחפש/ת מורה פרטי'],
            ['tutor', 'אני רוצה ללמד', 'פותח/ת פרופיל מורה'],
          ].map(([value, title, hint]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={form.role === value}
              className={`role-pick__opt ${form.role === value ? 'is-active' : ''}`}
              onClick={() => setForm((f) => ({ ...f, role: value }))}
            >
              <strong>{title}</strong>
              <span>{hint}</span>
            </button>
          ))}
        </div>
        <label className="field">
          <span>שם מלא</span>
          <input autoComplete="name" required value={form.fullName} onChange={set('fullName')} />
        </label>
        <label className="field">
          <span>אימייל</span>
          <input type="email" dir="ltr" autoComplete="email" required value={form.email} onChange={set('email')} />
        </label>
        <label className="field">
          <span>סיסמה (לפחות 8 תווים)</span>
          <input type="password" dir="ltr" autoComplete="new-password" minLength={8} required value={form.password} onChange={set('password')} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn--accent btn--block" type="submit" disabled={busy}>
          {busy ? 'יוצרים חשבון…' : 'יצירת חשבון'}
        </button>
        <p className="muted small">
          כבר רשומים? <Link to="/login">לכניסה</Link>
        </p>
      </form>
    </AuthFrame>
  );
}
