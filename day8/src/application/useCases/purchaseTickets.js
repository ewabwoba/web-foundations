import { MINUTE, PAYMENT_GRACE_MINUTES } from '../../domain/constants.js';
import { isHoldExpired } from '../../domain/hold.js';
import { totalCents } from '../../domain/order.js';
import { HoldExpiredError, HoldNotFoundError } from '../../domain/errors.js';

// POST /orders
export const makePurchaseTickets = ({
  seatRepository, holdRepository, orderRepository, paymentGateway, clock, idGenerator,
}) =>
  async function purchaseTickets({ userId, holdId, paymentToken }) {
    const hold = await holdRepository.findById(holdId);
    if (!hold || hold.userId !== userId) throw new HoldNotFoundError();

    const now = clock.now();
    if (isHoldExpired(hold, now)) throw new HoldExpiredError();   // -> 410 Gone

    // Give the payment one extra minute so the hold cannot run out mid-payment.
    const expiresAt = Math.max(hold.expiresAt, now + PAYMENT_GRACE_MINUTES * MINUTE);
    await seatRepository.extendHold({ seatIds: hold.seatIds, userId, expiresAt });
    await holdRepository.save({ ...hold, expiresAt });

    const seats = await seatRepository.findByIds(hold.seatIds);
    const amountCents = totalCents(seats);

    // Idempotency key = hold id, so a retried request can never charge twice.
    const { paymentRef } = await paymentGateway.charge({
      token: paymentToken, amountCents, idempotencyKey: `hold-${hold.id}`,
    });   // throws PaymentFailedError (402): nothing is sold, the hold stays valid

    const order = {
      id: idGenerator.next('order'),
      userId,
      eventId: hold.eventId,
      totalCents: amountCents,
      paymentRef,
      createdAt: clock.now(),
    };

    try {
      // One transaction: seats HELD -> SOLD + order + tickets (UNIQUE seat_id).
      const saved = await orderRepository.placeOrder({
        order, seatIds: hold.seatIds, userId, now: clock.now(),
      });
      await holdRepository.delete(hold.id);
      return saved;
    } catch (error) {
      await paymentGateway.refund(paymentRef);   // never keep money for tickets we did not issue
      throw error;
    }
  };
