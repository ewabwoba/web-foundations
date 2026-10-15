import { useState } from 'react';
import { useApp } from '../AppContext.jsx';
import EventCard from '../components/EventCard.jsx';
import { useQuery } from '../hooks/useQuery.js';

export default function EventsPage() {
  const { useCases } = useApp();
  const [query, setQuery] = useState('');
  const { data: events, error, loading } = useQuery(() => useCases.listEvents({ query }), [query], { pollMs: 2000 });

  return (
    <>
      <h1>What's on</h1>
      <label className="search">
        <span className="visually-hidden">Search events</span>
        <input type="search" placeholder="Search by event or venue" value={query}
          onChange={(e) => setQuery(e.target.value)} />
      </label>

      {error && <p className="message message--error" role="alert">Events could not be loaded. Refresh the page.</p>}
      {loading && !events && <p className="muted">Loading events…</p>}
      {events && events.length === 0 && (
        <p className="empty">No events match "{query}". Try a shorter search, or clear it to see everything.</p>
      )}
      <div className="stubs">
        {events && events.map((event) => <EventCard key={event.id} event={event} />)}
      </div>
    </>
  );
}
