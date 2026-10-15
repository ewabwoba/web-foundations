// INFRASTRUCTURE LAYER: stand-in for PostgreSQL so the app runs with no backend.
// To go real, write new repository classes that talk to a database or a fetch() API
// and swap them in container.js. Nothing in domain/ or application/ changes.
import { SeatStatus, MINUTE } from '../domain/constants.js';

const DAY = 24 * 60 * MINUTE;

export class InMemoryDatabase {
  constructor(clock) {
    this.clock = clock;
    this.reset();
  }

  reset() {
    this.events = new Map();
    this.seats = new Map();
    this.holds = new Map();
    this.orders = [];
    this.ticketSeatIndex = new Set();   // models: tickets.seat_id UNIQUE
    this.nextId = { event: 1, seat: 1, hold: 1, order: 1, ticket: 1 };
    this.seed();
  }

  seed() {
    const now = this.clock.now();
    const venues = [
      { title: 'Neon Harbour: Live in Concert', venue: 'Grand Arena', days: 21, rows: 'ABCDEF', perRow: 10, price: [120, 110, 95, 80, 70, 60], sold: ['A1', 'A2', 'B5', 'C3', 'C4', 'D7'] },
      { title: 'Jazz Under the Stars', venue: 'Riverside Amphitheatre', days: 9, rows: 'ABCD', perRow: 8, price: [85, 75, 65, 55], sold: ['A3', 'B2'] },
      { title: 'Late Night Comedy Club', venue: 'The Basement Room', days: 4, rows: 'ABC', perRow: 8, price: [40, 35, 30], sold: [] },
    ];

    for (const v of venues) {
      const eventId = this.nextId.event++;
      this.events.set(eventId, {
        id: eventId, title: v.title, venue: v.venue,
        startsAt: now + v.days * DAY, onSaleAt: now - DAY,
      });
      [...v.rows].forEach((row, rowIndex) => {
        for (let number = 1; number <= v.perRow; number++) {
          const id = this.nextId.seat++;
          this.seats.set(id, {
            id, eventId, row, number, label: `${row}${number}`,
            priceCents: v.price[rowIndex] * 100,
            status: SeatStatus.AVAILABLE, heldBy: null, holdExpiresAt: null,
          });
        }
      });
      // Pre-sold seats make the demo feel real (and each has a real ticket row).
      for (const label of v.sold) {
        const seat = [...this.seats.values()].find((s) => s.eventId === eventId && s.label === label);
        seat.status = SeatStatus.SOLD;
        const orderId = this.nextId.order++;
        const ticketId = this.nextId.ticket++;
        this.orders.push({
          id: orderId, userId: 'earlier-customer', eventId, totalCents: seat.priceCents,
          paymentRef: `seed-${orderId}`, createdAt: now - 2 * DAY,
          tickets: [{ id: ticketId, seatId: seat.id }],
        });
        this.ticketSeatIndex.add(seat.id);
      }
    }
  }
}
