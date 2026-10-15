// The "background worker" from the design: frees seats whose hold ran out.
// (Even if it runs late, tryHold still lets a new buyer take an expired seat.)
export const makeReleaseExpiredHolds = ({ seatRepository, holdRepository, clock }) =>
  async function releaseExpiredHolds() {
    const now = clock.now();
    await seatRepository.releaseExpired(now);
    await holdRepository.deleteExpired(now);
  };
