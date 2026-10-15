import { useApp } from '../AppContext.jsx';
import { formatDate, formatMoney } from '../format.js';
import { useQuery } from '../hooks/useQuery.js';

export default function TicketsPage() {
  const { useCases, userId } = useApp();
  const { data: tickets, error, loading } = useQuery(() => useCases.getMyTickets({ userId }), []);

  return (
    <>
      <h1>My tickets</h1>
      {error && <p className="message message--error" role="alert">Your tickets could not be loaded. Refresh the page.</p>}
      {loading && !tickets && <p className="muted">Loading tickets…</p>}
      {tickets && tickets.length === 0 && (
        <p className="empty">You have no tickets yet. <a href="#/">Browse events</a> and pick your seats.</p>
      )}
      <div className="stubs">
        {tickets && tickets.map((t) => (
          <article className="stub stub--ticket" key={t.id}>
            <div className="stub__main">
              <h2>{t.eventTitle}</h2>
              <p className="stub__venue">{t.venue}</p>
              <p className="stub__date">{formatDate(t.startsAt)}</p>
              <p className="muted">Order #{t.orderId}, {formatMoney(t.priceCents)}</p>
            </div>
            <div className="stub__side">
              <span>Seat</span>
              <strong>{t.seatLabel}</strong>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
