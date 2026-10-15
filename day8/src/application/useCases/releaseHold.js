import { HoldNotFoundError } from '../../domain/errors.js';

// DELETE /holds/{holdId}
export const makeReleaseHold = ({ holdRepository, seatRepository }) =>
  async function releaseHold({ userId, holdId }) {
    const hold = await holdRepository.findById(holdId);
    if (!hold || hold.userId !== userId) throw new HoldNotFoundError();
    await seatRepository.release({ seatIds: hold.seatIds, userId });
    await holdRepository.delete(holdId);
  };
