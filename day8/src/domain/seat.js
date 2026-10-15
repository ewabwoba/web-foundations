import { SeatStatus } from './constants.js';

/** A seat can be taken if it is free, or if its hold has run out. */
export function isSeatAvailable(seat, now) {
  if (seat.status === SeatStatus.AVAILABLE) return true;
  return seat.status === SeatStatus.HELD && seat.holdExpiresAt <= now;
}

/** True when this user still has a valid (unexpired) hold on the seat. */
export function isActiveHoldOf(seat, userId, now) {
  return seat.status === SeatStatus.HELD && seat.heldBy === userId && seat.holdExpiresAt > now;
}

/** What one particular viewer should see for a seat. */
export function viewStatus(seat, userId, now) {
  if (seat.status === SeatStatus.SOLD) return 'SOLD';
  if (isSeatAvailable(seat, now)) return 'AVAILABLE';
  return seat.heldBy === userId ? 'HELD_BY_YOU' : 'HELD';
}
