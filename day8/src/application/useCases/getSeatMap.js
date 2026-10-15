import { viewStatus } from '../../domain/seat.js';

// Returns the seat map as ONE viewer should see it (this is the "cached, may be
// slightly stale" read in the design; the database decides when you actually hold).
export const makeGetSeatMap = ({ seatRepository, clock }) =>
  async function getSeatMap({ eventId, userId }) {
    const seats = await seatRepository.findByEvent(eventId);
    const now = clock.now();
    return seats.map((seat) => ({
      id: seat.id,
      label: seat.label,
      row: seat.row,
      number: seat.number,
      priceCents: seat.priceCents,
      status: viewStatus(seat, userId, now),
    }));
  };
