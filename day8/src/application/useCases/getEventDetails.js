import { EventNotFoundError } from '../../domain/errors.js';

export const makeGetEventDetails = ({ eventRepository }) =>
  async function getEventDetails(eventId) {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new EventNotFoundError(eventId);
    return event;
  };
