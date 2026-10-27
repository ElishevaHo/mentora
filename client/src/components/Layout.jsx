import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLive } from '../context/LiveContext.jsx';
import { Avatar } from './Avatar.jsx';

export function Layout() {
  const { user, logout } = useAuth();
  const { unread } = useLive();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="shell">
      <a href="#main" className="skip-link">דילוג לתוכן</a>
      <header className="masthead">
        <div className="masthead__inner">
          <Link to="/" className="wordmark" aria-label="Mentora, לדף הבית">
            <span className="wordmark__mark" aria-hidden="true">M</span>
            Mentora
          </Link>

          <button
            type="button"
            className="masthead__toggle"
            aria-expanded={open}
            aria-controls="main-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span aria-hidden="true">{open ? '✕' : '☰'}</span>
            <span className="sr-only">תפריט</span>
          </button>

          <nav id="main-nav" className={`nav ${open ? 'is-open' : ''}`}>
            <NavLink to="/tutors" className="nav__link">מורים</NavLink>
            {user && <NavLink to="/lessons" className="nav__link">השיעורים שלי</NavLink>}
            {user && (
              <NavLink to="/inbox" className="nav__link">
                הודעות
                {unread > 0 && <span className="badge" aria-label={`${unread} הודעות שלא נקראו`}>{unread}</span>}
              </NavLink>
            )}
            {user?.role === 'tutor' && <NavLink to="/studio" className="nav__link">הסטודיו שלי</NavLink>}
            {user?.role === 'admin' && <NavLink to="/admin" className="nav__link">ניהול</NavLink>}

            <span className="nav__spacer" />

            {user ? (
              <>
                <NavLink to="/account" className="nav__me">
                  <Avatar person={user} size={32} />
                  <span>{user.fullName.split(' ')[0]}</span>
                </NavLink>
                <button type="button" className="nav__link nav__logout" onClick={logout}>יציאה</button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="nav__link">כניסה</NavLink>
                <Link to="/register" className="btn btn--ink btn--sm">הצטרפות</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main" className="page">
        <Outlet />
      </main>

      <footer className="colophon">
        <div className="colophon__inner">
          <div>
            <span className="wordmark wordmark--small">
              <span className="wordmark__mark" aria-hidden="true">M</span>Mentora
            </span>
            <p>מחברים בין תלמידים למורים פרטיים: חיפוש, הזמנת שיעור והודעות במקום אחד.</p>
          </div>
          <div className="colophon__links">
            <Link to="/tutors">כל המורים</Link>
            <Link to="/register">מלמדים? הצטרפו</Link>
            <Link to="/about">על הפרויקט</Link>
          </div>
        </div>
        <p className="colophon__fine">כל המורים והתלמידים באתר הם דמויות לדוגמה.</p>
      </footer>
    </div>
  );
}
