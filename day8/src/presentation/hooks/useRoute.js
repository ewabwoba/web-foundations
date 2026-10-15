import { useEffect, useState } from 'react';

/** Tiny hash router: #/ , #/events/2 , #/tickets */
function parse(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'events' && parts[1]) return { name: 'event', eventId: Number(parts[1]) };
  if (parts[0] === 'tickets') return { name: 'tickets' };
  return { name: 'events' };
}

export function useRoute() {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
