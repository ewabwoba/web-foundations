import { PaymentFailedError } from '../domain/errors.js';

// Stand-in for Stripe/M-Pesa/etc. We never touch card data ourselves.
export class FakePaymentGateway {
  constructor() {
    this.charges = new Map();   // idempotencyKey -> paymentRef
    this.refunds = [];
    this.failNext = false;      // dev tool: make the next payment fail
    this.counter = 1;
  }

  async charge({ token, amountCents, idempotencyKey }) {
    if (this.charges.has(idempotencyKey)) {
      return { paymentRef: this.charges.get(idempotencyKey) };   // retry: no double charge
    }
    if (this.failNext || token === 'tok_declined') {
      this.failNext = false;
      throw new PaymentFailedError('The card was declined.');
    }
    if (!(amountCents > 0)) throw new PaymentFailedError('Invalid amount.');
    const paymentRef = `pay_${String(this.counter++).padStart(5, '0')}`;
    this.charges.set(idempotencyKey, paymentRef);
    return { paymentRef };
  }

  async refund(paymentRef) { this.refunds.push(paymentRef); }
}
