import { HOLD_MINUTES } from '../../domain/constants.js';
import { formatCountdown, formatMoney } from '../format.js';
import { useCountdown } from '../hooks/useCountdown.js';

export default function CheckoutPanel({ hold, seats, onPay, onRelease, busy }) {
  const remaining = useCountdown(hold.expiresAt);
  const total = seats.reduce((sum, s) => sum + s.priceCents, 0);
  const urgent = remaining < 60 * 1000;
  return (
    <section className="panel panel--checkout" aria-labelledby="checkout-title">
      <h2 id="checkout-title">Pay to keep your seats</h2>
      <p className={`countdown ${urgent ? 'countdown--urgent' : ''}`} role="timer" aria-live="off">
        {formatCountdown(remaining)}
        <span>left of your {HOLD_MINUTES}-minute hold</span>
      </p>
      <ul className="lines">
        {seats.map((s) => (
          <li key={s.id}><span>Seat {s.label}</span><span>{formatMoney(s.priceCents)}</span></li>
        ))}
      </ul>
      <p className="total"><span>Total</span><strong>{formatMoney(total)}</strong></p>
      <button type="button" className="button" disabled={busy} onClick={onPay}>
        {busy ? 'Paying…' : `Pay ${formatMoney(total)}`}
      </button>
      <button type="button" className="button button--quiet" disabled={busy} onClick={onRelease}>
        Release seats
      </button>
    </section>
  );
}
