// DOMAIN LAYER: plain business rules. No React, no storage, no browser APIs.
export const SeatStatus = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  HELD: 'HELD',
  SOLD: 'SOLD',
});

export const MAX_SEATS_PER_USER = 4;      // fairness rule: max 4 seats per person per event
export const HOLD_MINUTES = 5;            // how long a seat hold lasts
export const PAYMENT_GRACE_MINUTES = 1;   // hold is extended this much when payment starts
export const MINUTE = 60 * 1000;
