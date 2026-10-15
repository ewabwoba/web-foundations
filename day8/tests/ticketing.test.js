import { describe, it, expect, beforeEach } from 'vitest';
import { createContainer } from '../src/infrastructure/container.js';
import { MINUTE } from '../src/domain/constants.js';
import {
  HoldExpiredError, PaymentFailedError, SeatUnavailableError, ValidationError,
} from '../src/domain/errors.js';

let app, uc, seatIds;
const ALICE = 'alice';
const BOB = 'bob';
const EVENT = 1;

async function freeSeats(n) {
  const map = await uc.getSeatMap({ eventId: EVENT, userId: ALICE });
  return map.filter((s) => s.status === 'AVAILABLE').slice(0, n).map((s) => s.id);
}

beforeEach(async () => {
  app = createContainer();
  uc = app.useCases;
  seatIds = await freeSeats(6);
});

describe('holding seats (layer 1: atomic conditional update)', () => {
  it('lets one user hold an available seat', async () => {
    const hold = await uc.holdSeats({ userId: ALICE, eventId: EVENT, seatIds: [seatIds[0]] });
    expect(hold.seatIds).toEqual([seatIds[0]]);
    const map = await uc.getSeatMap({ eventId: EVENT, userId: ALICE });
    expect(map.find((s) => s.id === seatIds[0]).status).toBe('HELD_BY_YOU');
    const bobsMap = await uc.getSeatMap({ eventId: EVENT, userId: BOB });
    expect(bobsMap.find((s) => s.id === seatIds[0]).status).toBe('HELD');
  });

  it('rejects a second user for the same seat with a 409', async () => {
    await uc.holdSeats({ userId: ALICE, eventId: EVENT, seatIds: [seatIds[0]] });
    await expect(uc.holdSeats({ userId: BOB, eventId: EVENT, seatIds: [seatIds[0]] }))
      .rejects.toMatchObject({ status: 409 });
  });

  it('gives exactly ONE winner when two users click the same seat at the same moment', async () => {
    const results = await Promise.allSettled([
      uc.holdSeats({ userId: ALICE, eventId: EVENT, seatIds: [seatIds[0]] }),
      uc.holdSeats({ userId: BOB, eventId: EVENT, seatIds: [seatIds[0]] }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const loser = results.find((r) => r.status === 'rejected');
    expect(loser.reason).toBeInstanceOf(SeatUnavailableError);
  });

  it('survives a crowd: 50 users, 1 seat, 1 winner', async () => {
    const attempts = Array.from({ length: 50 }, (_, i) =>
      uc.holdSeats({ userId: `user-${i}`, eventId: EVENT, seatIds: [seatIds[0]] }));
    const results = await Promise.allSettled(attempts);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('is all-or-nothing: if one of several seats is taken, none are held', async () => {
    await uc.holdSeats({ userId: BOB, eventId: EVENT, seatIds: [seatIds[1]] });
    await expect(uc.holdSeats({ userId: ALICE, eventId: EVENT, seatIds: [seatIds[0], seatIds[1]] }))
      .rejects.toBeInstanceOf(SeatUnavailableError);
    const map = await uc.getSeatMap({ eventId: EVENT, userId: ALICE });
    expect(map.find((s) => s.id === seatIds[0]).status).toBe('AVAILABLE');
  });

  it('enforces the 4-seat fairness limit', async () => {
    await expect(uc.holdSeats({ userId: ALICE, eventId: EVENT, seatIds: seatIds.slice(0, 5) }))
      .rejects.toBeInstanceOf(ValidationError);
    await expect(uc.holdSeats({ userId: ALICE, eventId: EVENT, seatIds: [] }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('lets someone else take a seat once the hold has expired', async () => {
    await uc.holdSeats({ userId: ALICE, eventId: EVENT, seatIds: [seatIds[0]] });
    app.dev.fastForwardMinutes(6);
    const hold = await uc.holdSeats({ userId: BOB, eventId: EVENT, seatIds: [seatIds[0]] });
    expect(hold.userId).toBe(BOB);
  });

  it('frees seats when a hold is released', async () => {
    const hold = await uc.holdSeats({ userId: ALICE, eventId: EVENT, seatIds: [seatIds[0]] });
    await uc.releaseHold({ userId: ALICE, holdId: hold.id });
    const again = await uc.holdSeats({ userId: BOB, eventId: EVENT, seatIds: [seatIds[0]] });
    expect(again.userId).toBe(BOB);
  });

  it('the background worker releases expired holds', async () => {
    await uc.holdSeats({ userId: ALICE, eventId: EVENT, seatIds: [seatIds[0]] });
    app.dev.fastForwardMinutes(6);
    await uc.releaseExpiredHolds();
    expect(app.db.seats.get(seatIds[0]).status).toBe('AVAILABLE');
  });
});

describe('buying tickets (layers 2 and 3: transaction + unique constraint)', () => {
  it('turns a hold into tickets and marks seats SOLD', async () => {
    const hold = await uc.holdSeats({ userId: ALICE, eventId: EVENT, seatIds: seatIds.slice(0, 2) });
    const order = await uc.purchaseTickets({ userId: ALICE, holdId: hold.id, paymentToken: 'tok_ok' });
    expect(order.tickets).toHaveLength(2);
    const tickets = await uc.getMyTickets({ userId: ALICE });
    expect(tickets).toHaveLength(2);
    await expect(uc.holdSeats({ userId: BOB, eventId: EVENT, seatIds: [seatIds[0]] }))
      .rejects.toMatchObject({ status: 409 });
  });

  it('returns 410 Gone when the hold expired before paying, and charges nothing', async () => {
    const hold = await uc.holdSeats({ userId: ALICE, eventId: EVENT, seatIds: [seatIds[0]] });
    app.dev.fastForwardMinutes(6);
    await expect(uc.purchaseTickets({ userId: ALICE, holdId: hold.id, paymentToken: 'tok_ok' }))
      .rejects.toBeInstanceOf(HoldExpiredError);
    expect(app.paymentGateway.charges.size).toBe(0);
  });

  it('returns 402 on a declined payment and keeps the seats held, not sold', async () => {
    const hold = await uc.holdSeats({ userId: ALICE, eventId: EVENT, seatIds: [seatIds[0]] });
    app.dev.failNextPayment();
    await expect(uc.purchaseTickets({ userId: ALICE, holdId: hold.id, paymentToken: 'tok_ok' }))
      .rejects.toBeInstanceOf(PaymentFailedError);
    expect(app.db.seats.get(seatIds[0]).status).toBe('HELD');
    const retry = await uc.purchaseTickets({ userId: ALICE, holdId: hold.id, paymentToken: 'tok_ok' });
    expect(retry.tickets).toHaveLength(1);
  });

  it("does not let one user pay with someone else's hold", async () => {
    const hold = await uc.holdSeats({ userId: ALICE, eventId: EVENT, seatIds: [seatIds[0]] });
    await expect(uc.purchaseTickets({ userId: BOB, holdId: hold.id, paymentToken: 'tok_ok' }))
      .rejects.toMatchObject({ status: 404 });
  });

  it('SAFETY NET: the unique constraint rejects a second ticket for one seat, rolls back, and refunds', async () => {
    const hold = await uc.holdSeats({ userId: ALICE, eventId: EVENT, seatIds: [seatIds[0]] });
    app.db.ticketSeatIndex.add(seatIds[0]);    // simulate a bug elsewhere that already issued a ticket
    await expect(uc.purchaseTickets({ userId: ALICE, holdId: hold.id, paymentToken: 'tok_ok' }))
      .rejects.toThrow(/UNIQUE constraint/);
    expect(app.db.seats.get(seatIds[0]).status).toBe('HELD');     // rolled back
    expect(await uc.getMyTickets({ userId: ALICE })).toHaveLength(0);
    expect(app.paymentGateway.refunds).toHaveLength(1);           // money returned
  });

  it('never charges twice for the same hold (idempotency)', async () => {
    const hold = await uc.holdSeats({ userId: ALICE, eventId: EVENT, seatIds: [seatIds[0]] });
    const a = await app.paymentGateway.charge({ token: 't', amountCents: 100, idempotencyKey: `hold-${hold.id}` });
    const b = await app.paymentGateway.charge({ token: 't', amountCents: 100, idempotencyKey: `hold-${hold.id}` });
    expect(a.paymentRef).toBe(b.paymentRef);
    expect(app.paymentGateway.charges.size).toBe(1);
  });
});

describe('browsing', () => {
  it('lists and searches events with seats left', async () => {
    const all = await uc.listEvents();
    expect(all).toHaveLength(3);
    const jazz = await uc.listEvents({ query: 'jazz' });
    expect(jazz).toHaveLength(1);
    expect(jazz[0].seatsLeft).toBe(30);
  });

  it('throws 404 for an unknown event', async () => {
    await expect(uc.getEventDetails(999)).rejects.toMatchObject({ status: 404 });
  });
});
