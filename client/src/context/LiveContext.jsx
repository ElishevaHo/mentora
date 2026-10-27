// Real-time layer: one socket per signed-in user, plus the unread-messages badge.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { api, tokenStore } from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';

const LiveContext = createContext({ socket: null, unread: 0, refreshUnread: () => {} });

export function LiveProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(() => {
    api('/messages/unread-count')
      .then((d) => setUnread(d.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return undefined;
    }
    const s = io({ auth: { token: tokenStore.get() } });
    setSocket(s);
    refreshUnread();

    const onMessage = (m) => {
      if (m.recipientId === user.id) refreshUnread();
    };
    s.on('message:new', onMessage);
    return () => {
      s.off('message:new', onMessage);
      s.disconnect();
      setSocket(null);
    };
  }, [user?.id, refreshUnread]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => ({ socket, unread, refreshUnread }), [socket, unread, refreshUnread]);
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export const useLive = () => useContext(LiveContext);

/** Subscribe to a socket event for the lifetime of the component. */
export function useSocketEvent(event, handler) {
  const { socket } = useLive();
  useEffect(() => {
    if (!socket) return undefined;
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [socket, event, handler]);
}
