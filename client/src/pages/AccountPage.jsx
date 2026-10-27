import { useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotice } from '../context/NoticeContext.jsx';
import { Avatar } from '../components/Avatar.jsx';

const ROLE_LABELS = { student: 'תלמיד/ה', tutor: 'מורה', admin: 'מנהל/ת מערכת' };

export default function AccountPage() {
  const { user, setUser } = useAuth();
  const notice = useNotice();
  const fileInput = useRef(null);
  const [fullName, setFullName] = useState(user.fullName);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState('');

  const run = async (key, work, message) => {
    setBusy(key);
    try {
      await work();
      notice(message);
    } catch (err) {
      notice(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const uploadAvatar = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const form = new FormData();
    form.append('avatar', file);
    run('avatar', async () => {
      const data = await api('/users/me/avatar', { method: 'PUT', form });
      setUser(data.user);
    }, 'התמונה עודכנה');
  };

  return (
    <div className="account">
      <h1 className="title title--xl">החשבון שלי</h1>

      <section className="panel account__identity">
        <Avatar person={user} size={96} />
        <div className="stack">
          <div>
            <strong className="account__name">{user.fullName}</strong>
            <span className="muted">{user.email} · {ROLE_LABELS[user.role]}</span>
          </div>
          <div className="btn-row">
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={uploadAvatar} />
            <button type="button" className="btn btn--ghost btn--sm" disabled={busy === 'avatar'} onClick={() => fileInput.current.click()}>
              {busy === 'avatar' ? 'מעלים…' : 'החלפת תמונה'}
            </button>
            {user.avatarUrl && (
              <button
                type="button"
                className="btn btn--text btn--sm"
                onClick={() => run('avatar', async () => {
                  setUser((await api('/users/me/avatar', { method: 'DELETE' })).user);
                }, 'התמונה הוסרה')}
              >
                הסרה
              </button>
            )}
          </div>
        </div>
      </section>

      <form
        className="panel stack"
        onSubmit={(e) => {
          e.preventDefault();
          run('name', async () => {
            setUser((await api('/users/me', { method: 'PUT', body: { fullName } })).user);
          }, 'השם עודכן');
        }}
      >
        <h2 className="panel__title">פרטים אישיים</h2>
        <label className="field">
          <span>שם מלא</span>
          <input value={fullName} maxLength={60} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <button type="submit" className="btn btn--ink" disabled={busy === 'name' || fullName === user.fullName}>שמירה</button>
      </form>

      <form
        className="panel stack"
        onSubmit={(e) => {
          e.preventDefault();
          run('password', async () => {
            await api('/users/me/password', { method: 'PUT', body: passwords });
            setPasswords({ currentPassword: '', newPassword: '' });
          }, 'הסיסמה שונתה');
        }}
      >
        <h2 className="panel__title">שינוי סיסמה</h2>
        <label className="field">
          <span>סיסמה נוכחית</span>
          <input
            type="password"
            dir="ltr"
            autoComplete="current-password"
            value={passwords.currentPassword}
            onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
          />
        </label>
        <label className="field">
          <span>סיסמה חדשה (לפחות 8 תווים)</span>
          <input
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={passwords.newPassword}
            onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
          />
        </label>
        <button type="submit" className="btn btn--ink" disabled={busy === 'password' || !passwords.newPassword}>עדכון סיסמה</button>
      </form>
    </div>
  );
}
