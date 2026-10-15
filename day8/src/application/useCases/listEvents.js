export const makeListEvents = ({ eventRepository, seatRepository, clock }) =>
  async function listEvents({ query = '' } = {}) {
    const events = await eventRepository.search(query);
    const now = clock.now();
    return Promise.all(
      events.map(async (event) => ({
        ...event,
        seatsLeft: await seatRepository.countAvailable(event.id, now),
      })),
    );
  };
