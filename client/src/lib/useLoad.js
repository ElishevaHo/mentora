import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

/** Fetch `path` on mount and whenever it changes. Pass null to skip. */
export function useLoad(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) });

  const load = useCallback((signal) => {
    if (!path) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path, { signal })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, error, loading: false });
      });
  }, [path]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const setData = useCallback((update) => {
    setState((s) => ({ ...s, data: typeof update === 'function' ? update(s.data) : update }));
  }, []);

  const reload = useCallback(() => load(), [load]);

  return { ...state, reload, setData };
}
