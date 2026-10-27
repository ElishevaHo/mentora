import { createContext, useCallback, useContext, useRef, useState } from 'react';

const NoticeContext = createContext(() => {});

export function NoticeProvider({ children }) {
  const [notices, setNotices] = useState([]);
  const nextId = useRef(1);

  const notice = useCallback((text, tone = 'ok') => {
    const id = nextId.current++;
    setNotices((list) => [...list, { id, text, tone }]);
    setTimeout(() => setNotices((list) => list.filter((n) => n.id !== id)), 3800);
  }, []);

  return (
    <NoticeContext.Provider value={notice}>
      {children}
      <div className="notices" role="status" aria-live="polite">
        {notices.map((n) => (
          <div key={n.id} className={`notice notice--${n.tone}`}>
            <span className="notice__mark" aria-hidden="true">{n.tone === 'error' ? '!' : '✓'}</span>
            {n.text}
          </div>
        ))}
      </div>
    </NoticeContext.Provider>
  );
}

export const useNotice = () => useContext(NoticeContext);
