// Domain errors carry an HTTP-style status so they map directly to the API design
// (400, 402, 404, 409, 410). The UI shows `message`; a real API would send `status`.
export class DomainError extends Error {
  constructor(message, { code, status }) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
  }
}

export class ValidationError extends DomainError {
  constructor(message) { super(message, { code: 'VALIDATION_ERROR', status: 400 }); }
}
export class EventNotFoundError extends DomainError {
  constructor(id) { super(`Event ${id} was not found.`, { code: 'EVENT_NOT_FOUND', status: 404 }); }
}
export class SeatUnavailableError extends DomainError {
  constructor(seatIds, labels) {
    super(
      `Seat ${labels.join(', ')} is no longer available. Pick another seat.`,
      { code: 'SEAT_UNAVAILABLE', status: 409 },
    );
    this.seatIds = seatIds;
  }
}
export class HoldNotFoundError extends DomainError {
  constructor() { super('That hold does not exist.', { code: 'HOLD_NOT_FOUND', status: 404 }); }
}
export class HoldExpiredError extends DomainError {
  constructor() {
    super('Your hold expired before payment finished. Select your seats again.', {
      code: 'HOLD_EXPIRED',
      status: 410,
    });
  }
}
export class PaymentFailedError extends DomainError {
  constructor(reason = 'The payment was declined.') {
    super(`${reason} You have not been charged. Try again before your hold runs out.`, {
      code: 'PAYMENT_FAILED',
      status: 402,
    });
  }
}
