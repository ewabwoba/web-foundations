import { HOLD_MINUTES, MINUTE } from './constants.js';

export function createHold({ id, userId, eventId, seatIds, now }) {
  return { id, userId, eventId, seatIds, expiresAt: now + HOLD_MINUTES * MINUTE };
}

export function isHoldExpired(hold, now) {
  return now >= hold.expiresAt;
}
