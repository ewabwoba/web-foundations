import { MAX_SEATS_PER_USER } from '../../domain/constants.js';
import { formatMoney } from '../format.js';

export default function SelectionPanel({ seats, onHold, busy }) {
  const total = seats.reduce((sum, s) => sum + s.priceCents, 0);
  return (
    <section className="panel" aria-labelledby="selection-title">
      <h2 id="selection-title">Your seats</h2>
      {seats.length === 0 ? (
        <p className="muted">Pick up to {MAX_SEATS_PER_USER} seats on the map.</p>
      ) : (
        <>
          <ul className="lines">
            {seats.map((s) => (
              <li key={s.id}><span>Seat {s.label}</span><span>{formatMoney(s.priceCents)}</span></li>
            ))}
          </ul>
          <p className="total"><span>Total</span><strong>{formatMoney(total)}</strong></p>
        </>
      )}
      <button type="button" className="button" disabled={seats.length === 0 || busy} onClick={onHold}>
        {busy ? 'Holding…' : 'Hold seats for 5 minutes'}
      </button>
    </section>
  );
}
