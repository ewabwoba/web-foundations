import { useCallback, useEffect, useRef, useState } from 'react';

/** Runs an async function, keeps {data, error, loading}, and can re-run on an interval. */
export function useQuery(fn, deps, { pollMs } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async () => {
    try {
      const data = await fnRef.current();
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState((s) => ({ ...s, error, loading: false }));
    }
  }, []);

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    reload();
    if (!pollMs) return undefined;
    const timer = setInterval(reload, pollMs);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload };
}
