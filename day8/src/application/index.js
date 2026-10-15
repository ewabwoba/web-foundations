import { makeListEvents } from './useCases/listEvents.js';
import { makeGetEventDetails } from './useCases/getEventDetails.js';
import { makeGetSeatMap } from './useCases/getSeatMap.js';
import { makeHoldSeats } from './useCases/holdSeats.js';
import { makeGetMyHold } from './useCases/getMyHold.js';
import { makeReleaseHold } from './useCases/releaseHold.js';
import { makeReleaseExpiredHolds } from './useCases/releaseExpiredHolds.js';
import { makePurchaseTickets } from './useCases/purchaseTickets.js';
import { makeGetMyTickets } from './useCases/getMyTickets.js';

/** Wires every use case to the ports (repositories, gateway, clock) it needs. */
export function buildUseCases(deps) {
  return {
    listEvents: makeListEvents(deps),
    getEventDetails: makeGetEventDetails(deps),
    getSeatMap: makeGetSeatMap(deps),
    holdSeats: makeHoldSeats(deps),
    getMyHold: makeGetMyHold(deps),
    releaseHold: makeReleaseHold(deps),
    releaseExpiredHolds: makeReleaseExpiredHolds(deps),
    purchaseTickets: makePurchaseTickets(deps),
    getMyTickets: makeGetMyTickets(deps),
  };
}
