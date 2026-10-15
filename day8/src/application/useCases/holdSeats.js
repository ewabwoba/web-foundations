import { MAX_SEATS_PER_USER } from '../../domain/constants.js';
import { createHold } from '../../domain/hold.js';
import {
  EventNotFoundError,
  SeatUnavailableError,
  ValidationError,
} from '../../domain/errors.js';

// POST /events/{id}/holds
export const makeHoldSeats = ({
  eventRepository, seatRepository, holdRepository, orderRepository, clock, idGenerator,
}) =>
  async function holdSeats({ userId, eventId, seatIds }) {
    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      throw new ValidationError('Choose at least one seat.');
    }
    // Sorted ids: seats are always locked in the same order, so two buyers can never deadlock.
    const ids = [...new Set(seatIds)].sort((a, b) => a - b);

    const event = await eventRepository.findById(eventId);
    if (!event) throw new EventNotFoundError(eventId);

    const now = clock.now();
    const alreadyOwned = await orderRepository.countTicketsForUserEvent(userId, eventId);
    if (ids.length + alreadyOwned > MAX_SEATS_PER_USER) {
      throw new ValidationError(`You can have at most ${MAX_SEATS_PER_USER} seats per event.`);
    }
    if (await holdRepository.findActiveByUserAndEvent(userId, eventId, now)) {
      throw new ValidationError('You already hold seats for this event. Pay or release them first.');
    }

    const seats = await seatRepository.findByIds(ids);
    if (seats.length !== ids.length || seats.some((s) => s.eventId !== eventId)) {
      throw new ValidationError('One or more seats do not belong to this event.');
    }

    const hold = createHold({ id: idGenerator.next('hold'), userId, eventId, seatIds: ids, now });

    // The atomic, all-or-nothing conditional update (design doc, layer 1).
    const result = await seatRepository.tryHold({
      seatIds: ids, userId, now, expiresAt: hold.expiresAt,
    });
    if (!result.ok) {
      const labels = seats
        .filter((s) => result.unavailableSeatIds.includes(s.id))
        .map((s) => s.label);
      throw new SeatUnavailableError(result.unavailableSeatIds, labels);
    }

    await holdRepository.save(hold);
    return hold;
  };
