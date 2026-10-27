import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useLoad } from '../lib/useLoad.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLive, useSocketEvent } from '../context/LiveContext.jsx';
import { useNotice } from '../context/NoticeContext.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { Empty, ErrorNote, Loading } from '../components/Feedback.jsx';
import { dayKey, fmtLongDate, fmtTime, timeAgo } from '../lib/format.js';

export default function InboxPage() {
  const { userId } = useParams();
  const activeId = userId ? Number(userId) : null;
  const threads = useLoad('/messages/threads');

  const refreshThreads = threads.reload;
  useSocketEvent('message:new', useCallback(() => refreshThreads(), [refreshThreads]));

  return (
    <div className={`inbox ${activeId ? 'has-active' : ''}`}>
      <aside className="inbox__list" aria-label="שיחות">
        <h1 className="title">הודעות</h1>
        {threads.loading && !threads.data && <Loading />}
        {threads.error && <ErrorNote error={threads.error} onRetry={threads.reload} />}
        {threads.data?.threads.length === 0 && (
          <p className="muted small">עוד אין שיחות. אפשר לפתוח שיחה מעמוד של מורה.</p>
        )}
        <ul>
          {threads.data?.threads.map((t) => (
            <li key={t.contact.id}>
              <Link
                to={`/inbox/${t.contact.id}`}
                className={`thread ${t.contact.id === activeId ? 'is-active' : ''} ${t.unread ? 'is-unread' : ''}`}
              >
                <Avatar person={t.contact} size={42} />
                <span className="thread__text">
                  <span className="thread__top">
                    <strong>{t.contact.fullName}</strong>
                    <span className="muted small">{timeAgo(t.lastMessage.createdAt)}</span>
                  </span>
                  <span className="thread__preview">
                    {t.lastMessage.fromMe && 'את/ה: '}{t.lastMessage.body}
                  </span>
                </span>
                {t.unread > 0 && <span className="badge">{t.unread}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      <section className="inbox__chat">
        {activeId ? (
          <Conversation key={activeId} otherId={activeId} onSent={refreshThreads} />
        ) : (
          <Empty title="בחרו שיחה">ההודעות מתעדכנות בזמן אמת, בלי לרענן את הדף.</Empty>
        )}
      </section>
    </div>
  );
}

function Conversation({ otherId, onSent }) {
  const { user } = useAuth();
  const { socket, refreshUnread } = useLive();
  const notice = useNotice();
  const { data, error, loading, setData } = useLoad(`/messages/${otherId}`);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const scroller = useRef(null);
  const typingTimer = useRef(null);
  const lastTypingSent = useRef(0);

  useEffect(() => {
    if (data) refreshUnread();
  }, [data?.contact.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [data?.messages.length, typing]);

  const append = useCallback((message) => {
    setData((d) => (d && !d.messages.some((m) => m.id === message.id)
      ? { ...d, messages: [...d.messages, message] }
      : d));
  }, [setData]);

  useSocketEvent('message:new', useCallback((m) => {
    const inThread = (m.senderId === otherId && m.recipientId === user.id)
      || (m.senderId === user.id && m.recipientId === otherId);
    if (!inThread) return;
    append(m);
    if (m.senderId === otherId) {
      setTyping(false);
      // Opening the thread marks messages read; re-fetch quietly to sync the badge.
      api(`/messages/${otherId}`).then(refreshUnread).catch(() => {});
    }
  }, [otherId, user.id, append, refreshUnread]));

  useSocketEvent('typing', useCallback(({ from }) => {
    if (from !== otherId) return;
    setTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 2500);
  }, [otherId]));

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  const onDraft = (e) => {
    setDraft(e.target.value);
    const now = Date.now();
    if (socket && now - lastTypingSent.current > 1500) {
      lastTypingSent.current = now;
      socket.emit('typing', { to: otherId });
    }
  };

  const send = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      const { message } = await api(`/messages/${otherId}`, { method: 'POST', body: { body } });
      append(message);
      setDraft('');
      onSent();
    } catch (err) {
      notice(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorNote error={error} />;

  const { contact, messages } = data;
  let lastDay = null;

  return (
    <div className="chat">
      <header className="chat__head">
        <Link to="/inbox" className="chat__back" aria-label="חזרה לשיחות">→</Link>
        <Avatar person={contact} size={40} />
        <div>
          <strong>{contact.fullName}</strong>
          <span className="muted small">
            {typing ? 'מקליד/ה…' : contact.role === 'tutor' ? 'מורה' : 'תלמיד/ה'}
          </span>
        </div>
        {contact.role === 'tutor' && (
          <Link to={`/tutors/${contact.id}`} className="btn btn--ghost btn--sm chat__profile">לפרופיל</Link>
        )}
      </header>

      <div className="chat__scroll" ref={scroller}>
        {messages.length === 0 && (
          <p className="chat__hint">זו תחילת השיחה עם {contact.fullName.split(' ')[0]}. כדאי להציג את עצמך ולספר מה תרצו ללמוד.</p>
        )}
        {messages.map((m) => {
          const day = dayKey(m.createdAt);
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = m.senderId === user.id;
          return (
            <div key={m.id} className="chat__group">
              {showDay && <div className="chat__day"><span>{fmtLongDate(m.createdAt)}</span></div>}
              <div className={`bubble ${mine ? 'bubble--mine' : 'bubble--theirs'}`}>
                <p>{m.body}</p>
                <time dateTime={m.createdAt}>{fmtTime(m.createdAt)}</time>
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="bubble bubble--theirs bubble--typing" aria-label="מקליד/ה">
            <span /><span /><span />
          </div>
        )}
      </div>

      <form className="chat__composer" onSubmit={send}>
        <label className="sr-only" htmlFor="chat-input">הודעה</label>
        <textarea
          id="chat-input"
          rows={1}
          value={draft}
          maxLength={2000}
          placeholder="כתבו הודעה…"
          onChange={onDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) send(e);
          }}
        />
        <button type="submit" className="btn btn--ink" disabled={sending || !draft.trim()}>שליחה</button>
      </form>
    </div>
  );
}
