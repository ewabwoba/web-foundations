// COMPOSITION ROOT: the ONLY place that knows which concrete classes are used.
import { buildUseCases } from '../application/index.js';
import { MINUTE } from '../domain/constants.js';
import { FakePaymentGateway } from './FakePaymentGateway.js';
import { InMemoryDatabase } from './InMemoryDatabase.js';
import { InMemoryEventRepository } from './InMemoryEventRepository.js';
import { InMemoryHoldRepository } from './InMemoryHoldRepository.js';
import { InMemoryOrderRepository } from './InMemoryOrderRepository.js';
import { InMemorySeatRepository } from './InMemorySeatRepository.js';
import { OffsetClock } from './OffsetClock.js';
import { SequentialIdGenerator } from './SequentialIdGenerator.js';

export const DEMO_USER_ID = 'demo-user';
export const RIVAL_USER_ID = 'rival-user';

export function createContainer() {
  const clock = new OffsetClock();
  const db = new InMemoryDatabase(clock);
  const idGenerator = new SequentialIdGenerator(db);
  const paymentGateway = new FakePaymentGateway();

  const useCases = buildUseCases({
    eventRepository: new InMemoryEventRepository(db),
    seatRepository: new InMemorySeatRepository(db),
    holdRepository: new InMemoryHoldRepository(db),
    orderRepository: new InMemoryOrderRepository(db, idGenerator),
    paymentGateway,
    clock,
    idGenerator,
  });

  /** Background worker from the design: every few seconds, free seats with expired holds. */
  function startBackgroundWorker(intervalMs = 3000) {
    const timer = setInterval(() => useCases.releaseExpiredHolds(), intervalMs);
    return () => clearInterval(timer);
  }

  /** Demo-only helpers used by the "Demo controls" panel. Not part of the real app. */
  const dev = {
    async rivalTakes({ eventId, seatIds }) {
      const old = await useCases.getMyHold({ userId: RIVAL_USER_ID, eventId });
      if (old) await useCases.releaseHold({ userId: RIVAL_USER_ID, holdId: old.id });
      return useCases.holdSeats({ userId: RIVAL_USER_ID, eventId, seatIds: seatIds.slice(0, 4) });
    },
    fastForwardMinutes(minutes) { clock.advance(minutes * MINUTE); },
    failNextPayment() { paymentGateway.failNext = true; },
    resetData() { db.reset(); },
  };

  return { userId: DEMO_USER_ID, clock, useCases, startBackgroundWorker, dev, db, paymentGateway };
}
