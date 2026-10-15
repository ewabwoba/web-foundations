import { useState } from 'react';
import { MAX_SEATS_PER_USER } from '../../domain/constants.js';
import { useApp } from '../AppContext.jsx';
import CheckoutPanel from '../components/CheckoutPanel.jsx';
import DemoControls from '../components/DemoControls.jsx';
import Message from '../components/Message.jsx';
import SeatMap from '../components/SeatMap.jsx';
import SelectionPanel from '../components/SelectionPanel.jsx';
import { errorMessage, formatDate } from '../format.js';
import { useQuery } from '../hooks/useQuery.js';

export default function EventPage({ eventId }) {
  const { useCases, userId } = useApp();
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  // The seat map refreshes every second, like the 1-2 second cache in the design.
  const { data, error, reload } = useQuery(async () => {
    const [event, seats, hold] = await Promise.all([
      useCases.getEventDetails(eventId),
      useCases.getSeatMap({ eventId, userId }),
      useCases.getMyHold({ userId, eventId }),
    ]);
    return { event, seats, hold };
  }, [eventId], { pollMs: 1000 });

  if (error && !data) {
    return (
      <>
        <p className="message message--error" role="alert">{errorMessage(error)}</p>
        <a href="#/">Back to events</a>
      </>
    );
  }
  if (!data) return <p className="muted">Loading seats…</p>;

  const { event, seats, hold } = data;
  const seatById = Object.fromEntries(seats.map((s) => [s.id, s]));
  // Drop selections that someone else took in the meantime.
  const selectedIds = selected.filter((id) => seatById[id]?.status === 'AVAILABLE');
  const selectedSeats = selectedIds.map((id) => seatById[id]);
  const holdSeats = hold ? hold.seatIds.map((id) => seatById[id]).filter(Boolean) : [];

  const toggleSeat = (seat) => {
    setConfirmed(null);
    if (selectedIds.includes(seat.id)) {
      setSelected(selectedIds.filter((id) => id !== seat.id));
      return;
    }
    if (hold) {
      setMessage({ type: 'error', text: 'You already hold seats. Pay for them or release them first.' });
      return;
    }
    if (selectedIds.length >= MAX_SEATS_PER_USER) {
      setMessage({ type: 'error', text: `You can pick at most ${MAX_SEATS_PER_USER} seats.` });
      return;
    }
    setMessage(null);
    setSelected([...selectedIds, seat.id]);
  };

  const act = async (work, onSuccess) => {
    setBusy(true);
    try {
      await work();
      onSuccess?.();
    } catch (e) {
      setMessage({ type: 'error', text: errorMessage(e) });
      setSelected([]);          // the map is refreshed below, so the person can choose again
    } finally {
      setBusy(false);
      reload();
    }
  };

  const holdSelected = () => act(
    () => useCases.holdSeats({ userId, eventId, seatIds: selectedIds }),
    () => { setSelected([]); setMessage(null); },
  );

  const release = () => act(
    () => useCases.releaseHold({ userId, holdId: hold.id }),
    () => setMessage({ type: 'info', text: 'Seats released.' }),
  );

  const pay = () => act(async () => {
    const order = await useCases.purchaseTickets({ userId, holdId: hold.id, paymentToken: 'tok_visa' });
    setConfirmed({ order, labels: holdSeats.map((s) => s.label) });
    setMessage(null);
  });

  return (
    <>
      <a className="back" href="#/">All events</a>
      <h1>{event.title}</h1>
      <p className="muted">{event.venue}, {formatDate(event.startsAt)}</p>

      <Message message={message} onDismiss={() => setMessage(null)} />
      {confirmed && (
        <div className="message message--success" role="status">
          <span>Payment received. Seats {confirmed.labels.join(', ')} are yours.</span>
          <a href="#/tickets">View my tickets</a>
        </div>
      )}

      <div className="layout">
        <SeatMap seats={seats} selectedIds={selectedIds} onToggle={toggleSeat} />
        <aside>
          {hold
            ? <CheckoutPanel hold={hold} seats={holdSeats} onPay={pay} onRelease={release} busy={busy} />
            : <SelectionPanel seats={selectedSeats} onHold={holdSelected} busy={busy} />}
        </aside>
      </div>

      <DemoControls eventId={eventId} selectedIds={selectedIds} onChange={reload}
        onNote={(text) => setMessage({ type: 'info', text })} />
    </>
  );
}
