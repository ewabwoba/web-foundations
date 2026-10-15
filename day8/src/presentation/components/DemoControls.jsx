import { useApp } from '../AppContext.jsx';

/** Lets you trigger the tricky situations from the design doc on demand. Demo only. */
export default function DemoControls({ eventId, selectedIds, onChange, onNote }) {
  const { dev } = useApp();
  const run = async (fn, note) => {
    try { await fn(); onNote(note); } catch (e) { onNote(e.message); }
    onChange();
  };
  return (
    <details className="demo">
      <summary>Demo controls</summary>
      <p className="muted">Trigger the situations your design has to handle.</p>
      <div className="demo__buttons">
        <button type="button" className="button button--small button--quiet" disabled={selectedIds.length === 0}
          onClick={() => run(() => dev.rivalTakes({ eventId, seatIds: selectedIds }),
            'A rival buyer just took your selected seats. Now press "Hold seats" to see the 409 conflict.')}>
          Rival takes my selected seats
        </button>
        <button type="button" className="button button--small button--quiet"
          onClick={() => run(() => dev.fastForwardMinutes(6), 'Clock moved forward 6 minutes. Holds have expired.')}>
          Fast-forward 6 minutes
        </button>
        <button type="button" className="button button--small button--quiet"
          onClick={() => run(() => dev.failNextPayment(), 'The next payment will be declined (402).')}>
          Decline next payment
        </button>
        <button type="button" className="button button--small button--quiet"
          onClick={() => run(() => dev.resetData(), 'Demo data reset.')}>
          Reset demo data
        </button>
      </div>
    </details>
  );
}
