// APPLICATION LAYER: PORTS.
// These are the interfaces the use cases need. The application layer defines them;
// the infrastructure layer implements them. (The dependency points inward.)
//
// @typedef {Object} EventRepository
//   search(query): Promise<Event[]>
//   findById(id): Promise<Event|null>
//
// @typedef {Object} SeatRepository
//   findByEvent(eventId): Promise<Seat[]>
//   findByIds(ids): Promise<Seat[]>
//   countAvailable(eventId, now): Promise<number>
//   tryHold({ seatIds, userId, now, expiresAt }): Promise<{ ok, unavailableSeatIds }>
//        ^ ALL-OR-NOTHING atomic conditional update (layer 1 against double-booking)
//   extendHold({ seatIds, userId, expiresAt }): Promise<void>
//   release({ seatIds, userId }): Promise<void>
//   releaseExpired(now): Promise<void>
//
// @typedef {Object} HoldRepository
//   save(hold), findById(id), findActiveByUserAndEvent(userId, eventId, now),
//   delete(id), deleteExpired(now)
//
// @typedef {Object} OrderRepository
//   placeOrder({ order, seatIds, userId, now }): Promise<Order>
//        ^ ONE TRANSACTION: seats HELD -> SOLD, insert order + tickets.
//          tickets.seat_id is UNIQUE (layer 3). Rolls back on any failure.
//   countTicketsForUserEvent(userId, eventId): Promise<number>
//   findByUser(userId): Promise<Order[]>
//
// @typedef {Object} PaymentGateway
//   charge({ token, amountCents, idempotencyKey }): Promise<{ paymentRef }>
//   refund(paymentRef): Promise<void>
//
// @typedef {Object} Clock        now(): number (epoch ms)
// @typedef {Object} IdGenerator  next(prefix): number
export {};
