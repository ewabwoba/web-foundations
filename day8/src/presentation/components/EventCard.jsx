import { formatDate } from '../format.js';

// The "ticket stub" card: main body on the left, perforated stub on the right.
export default function EventCard({ event }) {
  const soldOut = event.seatsLeft === 0;
  return (
    <a className="stub" href={`#/events/${event.id}`}>
      <div className="stub__main">
        <h2>{event.title}</h2>
        <p className="stub__venue">{event.venue}</p>
        <p className="stub__date">{formatDate(event.startsAt)}</p>
      </div>
      <div className="stub__side">
        <strong>{soldOut ? 'Sold out' : event.seatsLeft}</strong>
        <span>{soldOut ? '' : 'seats left'}</span>
      </div>
    </a>
  );
}
