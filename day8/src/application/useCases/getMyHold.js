export const makeGetMyHold = ({ holdRepository, clock }) =>
  async function getMyHold({ userId, eventId }) {
    return holdRepository.findActiveByUserAndEvent(userId, eventId, clock.now());
  };
