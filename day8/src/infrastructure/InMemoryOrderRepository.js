import { SeatStatus } from '../domain/constants.js';
import { HoldExpiredError } from '../domain/errors.js';

export class InMemoryOrderRepository {
  constructor(db, idGenerator) {
    this.db = db;
    this.idGenerator = idGenerator;
  }

  /**
   * LAYERS 2 and 3: one transaction.
   *  - every seat must still be HELD by this user and not expired, then becomes SOLD
   *  - the order and its tickets are inserted
   *  - the unique index on ticket seat ids rejects a second ticket for the same seat
   * If anything fails, every change is undone (ROLLBACK) and the error is re-thrown.
   */
  async placeOrder({ order, seatIds, userId, now }) {
    const originalSeats = seatIds.map((id) => this.db.seats.get(id)).filter(Boolean).map((s) => ({ ...s }));
    const indexAdded = [];
    const rollback = () => {
      originalSeats.forEach((original) => Object.assign(this.db.seats.get(original.id), original));
      indexAdded.forEach((seatId) => this.db.ticketSeatIndex.delete(seatId));
    };

    try {
      for (const id of seatIds) {
        const seat = this.db.seats.get(id);
        const stillMine =
          seat && seat.status === SeatStatus.HELD && seat.heldBy === userId && seat.holdExpiresAt > now;
        if (!stillMine) throw new HoldExpiredError();
      }

      for (const id of seatIds) {
        Object.assign(this.db.seats.get(id), { status: SeatStatus.SOLD, heldBy: null, holdExpiresAt: null });
      }

      const tickets = [];
      for (const seatId of seatIds) {
        if (this.db.ticketSeatIndex.has(seatId)) {
          throw new Error('UNIQUE constraint failed: tickets.seat_id');
        }
        this.db.ticketSeatIndex.add(seatId);
        indexAdded.push(seatId);
        tickets.push({ id: this.idGenerator.next('ticket'), seatId });
      }

      const saved = { ...order, tickets };
      this.db.orders.push(saved);
      return { ...saved, tickets: tickets.map((t) => ({ ...t })) };
    } catch (error) {
      rollback();
      throw error;
    }
  }

  async countTicketsForUserEvent(userId, eventId) {
    return this.db.orders
      .filter((o) => o.userId === userId && o.eventId === eventId)
      .reduce((sum, o) => sum + o.tickets.length, 0);
  }

  async findByUser(userId) {
    return this.db.orders
      .filter((o) => o.userId === userId)
      .map((o) => ({ ...o, tickets: o.tickets.map((t) => ({ ...t })) }));
  }
}
