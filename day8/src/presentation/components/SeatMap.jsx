import { formatMoney } from '../format.js';

const STATUS_LABEL = {
  AVAILABLE: 'available',
  HELD_BY_YOU: 'held for you',
  HELD: 'held by someone else',
  SOLD: 'sold',
};

export default function SeatMap({ seats, selectedIds, onToggle }) {
  const rows = [...new Set(seats.map((s) => s.row))];
  return (
    <div className="seatmap">
      <div className="stage" aria-hidden="true">Stage</div>
      <div className="seatmap__rows">
        {rows.map((row) => (
          <div className="seatmap__row" key={row} role="group" aria-label={`Row ${row}`}>
            <span className="seatmap__rowlabel" aria-hidden="true">{row}</span>
            {seats.filter((s) => s.row === row).map((seat) => {
              const selected = selectedIds.includes(seat.id);
              const state = selected ? 'selected' : seat.status.toLowerCase();
              const canPick = seat.status === 'AVAILABLE';
              return (
                <button
                  key={seat.id}
                  type="button"
                  className={`seat seat--${state}`}
                  disabled={!canPick}
                  aria-pressed={canPick ? selected : undefined}
                  aria-label={`Seat ${seat.label}, ${formatMoney(seat.priceCents)}, ${selected ? 'selected' : STATUS_LABEL[seat.status]}`}
                  onClick={() => onToggle(seat)}
                >
                  {seat.status === 'SOLD' ? '×' : seat.number}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <ul className="legend" aria-label="Seat key">
        <li><span className="seat seat--available" aria-hidden="true" />Available</li>
        <li><span className="seat seat--selected" aria-hidden="true" />Selected</li>
        <li><span className="seat seat--held_by_you" aria-hidden="true" />Held for you</li>
        <li><span className="seat seat--held" aria-hidden="true" />Held by others</li>
        <li><span className="seat seat--sold" aria-hidden="true">×</span>Sold</li>
      </ul>
    </div>
  );
}
