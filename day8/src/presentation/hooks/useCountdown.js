import { useEffect, useState } from 'react';
import { useApp } from '../AppContext.jsx';

/** Milliseconds left until `expiresAt`, updating 4 times a second. */
export function useCountdown(expiresAt) {
  const { clock } = useApp();
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(timer);
  }, []);
  return Math.max(0, expiresAt - clock.now());
}
