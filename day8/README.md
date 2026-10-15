# TicketHub (React + Clean Architecture)

A working front end for the TicketHub design in `day8/ticketing-design.md`.
It runs entirely in the browser: an in-memory "database" stands in for PostgreSQL, so you can demo
seat holds, payments and double-booking prevention with no backend.

## Run it

```bash
npm install
npm run dev      # open the address Vite prints
npm test         # 17 tests, including the double-booking race
npm run build
```

## Architecture

Dependencies point **inward only**. Inner layers never import outer ones.

```
src/
  domain/           Business rules. Pure JavaScript. No React, no storage.
    constants.js      seat statuses, 4-seat limit, 5-minute hold
    errors.js         400 / 402 / 404 / 409 / 410 errors (match the API design)
    seat.js hold.js order.js
  application/      Use cases = one per API endpoint. Depends only on domain.
    ports.js          the interfaces (repositories, payment gateway, clock)
    useCases/         listEvents, getSeatMap, holdSeats, purchaseTickets, ...
    index.js          wires use cases to their ports
  infrastructure/   Implements the ports. The only layer that knows "how".
    InMemory*Repository.js, FakePaymentGateway.js, OffsetClock.js
    container.js      composition root: the ONE place that picks concrete classes
  presentation/     React. Talks to use cases only (via AppContext), never to storage.
    pages/ components/ hooks/ styles.css
```

**Why this is useful:** to connect a real backend, write new repository classes that call your API
(or a database) and change the wiring in `container.js`. `domain/`, `application/` and every
React component stay untouched. The tests already prove the rules without React.

## Design doc to code

| Design doc | Where it lives |
|---|---|
| API: `POST /events/{id}/holds` | `application/useCases/holdSeats.js` |
| API: `DELETE /holds/{id}` | `releaseHold.js` |
| API: `POST /orders` | `purchaseTickets.js` |
| API: `GET /users/me/tickets` | `getMyTickets.js` |
| API: `GET /events`, `/events/{id}`, `/events/{id}/seats` | `listEvents.js`, `getEventDetails.js`, `getSeatMap.js` |
| Status codes 400/402/404/409/410 | `domain/errors.js` |
| Double-booking layer 1: atomic conditional update, all-or-nothing | `InMemorySeatRepository.tryHold` |
| Layer 2: transaction when paying, with rollback | `InMemoryOrderRepository.placeOrder` |
| Layer 3: unique constraint on ticket seat | `ticketSeatIndex` check in `placeOrder` |
| Hold extended 1 minute at payment start | `purchaseTickets.js` + `extendHold` |
| Idempotent payment (no double charge) | `FakePaymentGateway.charge` |
| Background worker releasing expired holds | `releaseExpiredHolds.js` + `startBackgroundWorker` |
| Seat map refreshes about every second (cache) | `EventPage.jsx` polling |
| Fairness: max 4 seats | `holdSeats.js` |

## Demo script (for the presentation)

1. Open an event, select 2 seats, press **Hold seats**. Watch the 5:00 countdown.
2. Press **Pay**. Open **My tickets** to see them.
3. Open another event, select a seat, then open **Demo controls** and press
   **Rival takes my selected seats**. Press **Hold seats**: you get the 409 message and a fresh map.
4. Hold seats, press **Decline next payment**, then **Pay**: you get the 402 message and still keep your hold.
5. Hold seats, press **Fast-forward 6 minutes**: the hold expires and the seats are free again.
6. Run `npm test` to show the "50 users, 1 seat, 1 winner" test.

## Limits (be honest about these in your presentation)

- Data resets when you refresh the page (there is no real database or server).
- "Rival" and the clock controls are demo helpers, not real features.
- The waiting room, CDN, Redis and read replicas from the architecture diagram are design-level
  components; this project implements the application logic they protect.
