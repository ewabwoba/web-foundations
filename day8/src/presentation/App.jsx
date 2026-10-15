import { useEffect } from 'react';
import { useApp } from './AppContext.jsx';
import Header from './components/Header.jsx';
import EventsPage from './pages/EventsPage.jsx';
import EventPage from './pages/EventPage.jsx';
import TicketsPage from './pages/TicketsPage.jsx';
import { useRoute } from './hooks/useRoute.js';

export default function App() {
  const { startBackgroundWorker } = useApp();
  const route = useRoute();

  // Starts the "release expired holds" worker described in the design doc.
  useEffect(() => startBackgroundWorker(), [startBackgroundWorker]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header route={route} />
      <main id="main" className="page">
        {route.name === 'events' && <EventsPage />}
        {route.name === 'event' && <EventPage key={route.eventId} eventId={route.eventId} />}
        {route.name === 'tickets' && <TicketsPage />}
      </main>
    </>
  );
}
