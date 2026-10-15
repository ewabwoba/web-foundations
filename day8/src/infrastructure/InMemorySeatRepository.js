import { SeatStatus } from '../domain/constants.js';
import { isSeatAvailable } from '../domain/seat.js';

export class InMemorySeatRepository {
  constructor(db) { this.db = db; }

  async findByEvent(eventId) {
    return [...this.db.seats.values()]
      .filter((s) => s.eventId === eventId)
      .map((s) => ({ ...s }));
  }

  async findByIds(ids) {
    return ids.map((id) => this.db.seats.get(id)).filter(Boolean).map((s) => ({ ...s }));
  }

  async countAvailable(eventId, now) {
    let count = 0;
    for (const seat of this.db.seats.values()) {
      if (seat.eventId === eventId && isSeatAvailable(seat, now)) count++;
    }
    return count;
  }

  /**
   * LAYER 1 against double-booking: "check and update" as ONE indivisible step,
   * like `UPDATE seats SET status='HELD' ... WHERE id=? AND (status='AVAILABLE' OR hold expired)`.
   * The body has no `await`, so JavaScript cannot interleave another request in the middle
   * (a real database gets the same guarantee from its row locks).
   * All-or-nothing: if any seat fails, no seat is changed (a rolled-back transaction).
   */
  async tryHold({ seatIds, userId, now, expiresAt }) {
    const unavailableSeatIds = seatIds.filter((id) => {
      const seat = this.db.seats.get(id);
      return !seat || !isSeatAvailable(seat, now);
    });
    if (unavailableSeatIds.length > 0) return { ok: false, unavailableSeatIds };

    for (const id of seatIds) {
      Object.assign(this.db.seats.get(id), {
        status: SeatStatus.HELD, heldBy: userId, holdExpiresAt: expiresAt,
      });
    }
    return { ok: true, unavailableSeatIds: [] };
  }

  async extendHold({ seatIds, userId, expiresAt }) {
    for (const id of seatIds) {
      const seat = this.db.seats.get(id);
      if (seat && seat.status === SeatStatus.HELD && seat.heldBy === userId) {
        seat.holdExpiresAt = expiresAt;
      }
    }
  }

  async release({ seatIds, userId }) {
    for (const id of seatIds) {
      const seat = this.db.seats.get(id);
      if (seat && seat.status === SeatStatus.HELD && seat.heldBy === userId) {
        Object.assign(seat, { status: SeatStatus.AVAILABLE, heldBy: null, holdExpiresAt: null });
      }
    }
  }

  async releaseExpired(now) {
    for (const seat of this.db.seats.values()) {
      if (seat.status === SeatStatus.HELD && seat.holdExpiresAt <= now) {
        Object.assign(seat, { status: SeatStatus.AVAILABLE, heldBy: null, holdExpiresAt: null });
      }
    }
  }
}
