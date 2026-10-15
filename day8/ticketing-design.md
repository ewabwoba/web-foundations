# TicketHub: Design Document

## 0. Context, Goals and Non-goals

**Context.** TicketHub is a website that sells tickets for concerts and events. Most days traffic is calm, but when a popular concert goes on sale, a huge crowd arrives at once and fights over a limited number of seats.

**Goals.** Let people browse events, pick specific seats, pay, and see their tickets. Never sell the same seat twice. Stay up during a big sale.

**Non-goals.** Resale or ticket transfers, refunds, seat-map editing tools for organisers, and mobile apps. These are left out to keep the design focused.

---

## 1. Requirements

### Functional
- Users can register and log in.
- Users can browse and search events and view event details.
- Users can view the seat map of an event with each seat's status (available / held / sold).
- Users can **hold** one or more seats temporarily (maximum 4 per user per event).
- Users can pay for held seats and receive tickets.
- Users can view their tickets and orders.

### Non-functional
| Quality | Target |
|---|---|
| **Speed** | Browsing pages load in under 300 ms (95th percentile); seat hold responds in under 500 ms |
| **Correctness** | A seat is **never** sold to two people, even under heavy simultaneous load |
| **Fairness** | First come, first served; one person cannot grab more than 4 seats; bots are rate limited |
| **Availability** | 99.9% normally; the site must stay usable (not crash) during a big sale |
| **Durability** | A paid order is never lost |
| **Security** | Passwords hashed; card details never stored (handled by a payment provider) |

---

## 2. Estimates

(1 day is about 100,000 seconds, as in the course.)

### Normal day
- 50,000 visitors x 10 pages = **500,000 page views/day**
- 500,000 / 100,000 = **about 5 requests/second** on average, about **25/second** at peak (x5)
- 5,000 tickets sold/day = **0.05 purchases/second**: tiny
- Read-to-write ratio: about 100 reads for each write (read-heavy)

### Big sale (200,000 people, 20,000 seats, first 10 minutes = 600 seconds)
- Arrivals: 200,000 / 600 = **about 333 new users/second**
- Each user loads the event page, seat map (refreshing a few times) and tries to hold seats: about 10 requests each, so 2,000,000 / 600 = **about 3,300 requests/second**, with bursts up to about 10,000/second in the first seconds
- Seat-hold attempts: about 200,000 x 3 = 600,000 / 600 = **about 1,000 attempts/second**, but only 20,000 can succeed
- Successful purchases: at most 20,000 / 600 = **about 33/second**
- Demand is **10 people for every seat**, so most users must fail gracefully

### Comparison
| | Normal | Big sale |
|---|---|---|
| Requests/second | about 5 (peak 25) | about 3,300 (burst 10,000) |
| Purchases/second | 0.05 | about 33 |

The big sale is roughly **600 times** the normal load for 10 minutes. We do **not** build the whole system for the big sale all year. Instead we protect the database from it (cache, waiting room) and add servers only when needed.

**Storage:** 5,000 orders/day x 365 is about 1.8 million orders/year at about 500 bytes each, so under 1 GB/year. Storage is not a problem. A 20,000-seat event is 20,000 rows. The real challenge is **concurrency**, not size.

---

## 3. API

All endpoints return JSON. `{id}` values are numbers. Protected endpoints need a login token.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | Create an account / log in |
| GET | `/events?query=&page=` | Browse and search events |
| GET | `/events/{id}` | Event details (venue, date, price) |
| GET | `/events/{id}/seats` | Seat map with status of each seat |
| POST | `/events/{id}/holds` | Hold seats for 5 minutes |
| DELETE | `/holds/{holdId}` | Release held seats |
| POST | `/orders` | Pay for a hold and create tickets |
| GET | `/users/me/tickets` | View my tickets |

### Examples

**Hold seats**
```
POST /events/42/holds
{ "seatIds": [101, 102] }

201 Created
{ "holdId": 9001, "expiresAt": "2026-10-20T18:05:00Z", "seatIds": [101, 102] }

409 Conflict   (a seat was already taken)
{ "error": "Seat 102 is no longer available" }

429 Too Many Requests   (rate limit)
```

**Pay**
```
POST /orders
{ "holdId": 9001, "paymentToken": "tok_abc123" }

201 Created
{ "orderId": 5555, "tickets": [ { "seatId": 101 }, { "seatId": 102 } ] }

410 Gone   (the hold expired before payment)
402 Payment Required   (payment failed)
```

**Other status codes:** `200 OK` for reads, `400 Bad Request` for invalid input (e.g. more than 4 seats), `401 Unauthorized` when not logged in, `404 Not Found` for an unknown event.

---

## 4. Data Model

```sql
CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
  id         INTEGER PRIMARY KEY,
  title      TEXT NOT NULL,
  venue      TEXT NOT NULL,
  starts_at  TEXT NOT NULL,
  on_sale_at TEXT NOT NULL
);

CREATE TABLE seats (
  id              INTEGER PRIMARY KEY,
  event_id        INTEGER NOT NULL REFERENCES events(id),
  label           TEXT NOT NULL,                       -- e.g. 'A12'
  price_cents     INTEGER NOT NULL CHECK (price_cents >= 0),
  status          TEXT NOT NULL DEFAULT 'AVAILABLE'
                  CHECK (status IN ('AVAILABLE','HELD','SOLD')),
  held_by         INTEGER REFERENCES users(id),        -- NULL unless HELD
  hold_expires_at TEXT,                                -- NULL unless HELD
  UNIQUE (event_id, label)                             -- no duplicate seat labels
);
CREATE INDEX idx_seats_event_status ON seats(event_id, status);

CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  event_id    INTEGER NOT NULL REFERENCES events(id),
  total_cents INTEGER NOT NULL,
  payment_ref TEXT NOT NULL UNIQUE,                    -- also prevents double-charging
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tickets (
  id       INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  seat_id  INTEGER NOT NULL UNIQUE REFERENCES seats(id)  -- one ticket per seat, ever
);
```

### Relationships
- A **user** has many **orders** (one-to-many).
- An **event** has many **seats** (one-to-many).
- An **order** has many **tickets** (one-to-many), and each **ticket** belongs to exactly one **seat**.
- `tickets.seat_id` is `UNIQUE`, so a seat can appear on at most one ticket (one-to-one).

---

## 5. How Double-Booking Is Prevented

Two people clicking the same seat at the same moment is the most important correctness problem. The design uses **three layers**, and the last one cannot be bypassed.

**Layer 1: Atomic conditional update to hold a seat.** We never "check, then update" in two steps (another request could slip in between). We do both in a single statement:

```sql
UPDATE seats
SET    status = 'HELD', held_by = :userId,
       hold_expires_at = :now_plus_5_minutes
WHERE  id = :seatId
  AND  (status = 'AVAILABLE'
        OR (status = 'HELD' AND hold_expires_at < :now));
```

The database locks the row while updating. If two users run this at the same instant, one runs first and changes the status; the second finds the `WHERE` condition false and updates **0 rows**. The app sees "0 rows changed" and returns `409 Conflict`. Exactly one person wins.

For several seats, all updates run **inside one transaction**: if any seat fails, the transaction rolls back (all or nothing). Seats are updated in ascending id order so two buyers cannot deadlock each other.

**Layer 2: Transaction when paying.** After the payment provider confirms payment (using a unique `payment_ref` so a retry never charges twice), one transaction does:

```sql
BEGIN;
UPDATE seats SET status = 'SOLD', held_by = NULL, hold_expires_at = NULL
WHERE id IN (:seatIds) AND status = 'HELD'
  AND held_by = :userId AND hold_expires_at > :now;   -- must still be my valid hold
-- if rows changed <> number of seats: ROLLBACK and return 410 Gone
INSERT INTO orders (...) VALUES (...);
INSERT INTO tickets (order_id, seat_id) VALUES (...), (...);
COMMIT;
```

To avoid a hold expiring during the payment itself, the hold is extended by one minute when payment starts. If payment fails or the transaction rolls back, nothing is sold and any charge is refunded automatically.

**Layer 3: Unique constraint as the safety net.** Even if there were a bug in the application code, `tickets.seat_id UNIQUE` makes the database **reject** a second ticket for the same seat. Correctness does not depend on the app being perfect.

**What the cache does *not* do.** The cached seat map is only a hint for the screen. It may be a second or two out of date, so a user may click a seat that was just taken. That is fine: the hold request goes to the primary database, which is the single source of truth, and returns `409`. The cache never decides who gets a seat.

**Expired holds.** A background worker runs every 30 seconds and sets expired `HELD` seats back to `AVAILABLE`. Even if the worker is late, the `hold_expires_at < :now` condition in Layer 1 lets a new buyer take an expired seat.

---

## 6. Architecture

```
   Users (browsers / phones)
            |
            v
   +------------------+      static files, images, event pages
   |       CDN        |  <-- (served from the edge, never reaches our servers)
   +------------------+
            |
            v
   +------------------+
   |  Waiting room /  |  lets only about 300 people/second into the
   |  rate limiter    |  buying flow during a big sale; the rest wait
   +------------------+
            |
            v
   +------------------+
   |  Load balancer   |
   +------------------+
      |      |      |
      v      v      v
   +----+ +----+ +----+
   |App | |App | |App |   stateless app servers (add more before a sale)
   +----+ +----+ +----+
      |      |      |
      +------+------+---------------------+
      |                                    |
      v                                    v
 +-----------+                    +------------------+
 |  Redis    |                    |  Payment provider|
 | cache,    |                    |  (external)      |
 | sessions, |                    +------------------+
 | rate limit|
 +-----------+
      |  cache miss / writes
      v
 +------------------------+   replication   +-----------------+
 |  PostgreSQL PRIMARY    | --------------> | Read replicas   |
 |  (all holds, orders)   |                 | (browse, search)|
 +------------------------+                 +-----------------+
      ^
      |
 +------------------------+
 | Background worker      |  releases expired holds, sends ticket emails
 +------------------------+
```

### Components and why each exists
| Component | Problem it solves |
|---|---|
| **CDN** | Images, scripts and event pages are the same for everyone, so serving them from the edge removes most traffic from our servers and makes pages fast worldwide. |
| **Waiting room / rate limiter** | 200,000 people at once would overwhelm the database. Admitting only about 300/second keeps load steady, makes the sale **fair** (first in the queue goes first) and blocks bots hammering the API. |
| **Load balancer** | One server cannot handle thousands of requests/second and would be a single point of failure. The balancer spreads requests and skips a dead server. |
| **Stateless app servers** | They keep no user data in memory (sessions live in Redis), so any server can handle any request and we can scale horizontally by adding servers. |
| **Redis cache** | Event details and the seat map are read thousands of times per second. Redis serves them from memory in about 1 ms. The seat map is cached for 1-2 seconds, so even 10,000 requests/second cause only about one database read per second per event. Redis also stores login sessions and rate-limit counters. |
| **PostgreSQL primary** | The single source of truth with transactions and constraints. All holds and purchases go here, which is what guarantees no double-booking. |
| **Read replicas** | Browsing and search read from copies, so they do not compete with seat purchases on the primary. A replica can take over if the primary fails. |
| **Payment provider** | Handles card data securely, so we never store it. |
| **Background worker** | Releases expired holds and sends emails outside the user's request, so they never slow down a purchase. |

### How it survives the big sale
1. The CDN absorbs page and image traffic.
2. The waiting room reduces about 10,000 requests/second to a controlled flow of about 300 users/second entering.
3. Extra app servers are added **before** the sale (we know the date in advance).
4. The seat map comes from Redis, so the database is not asked the same question thousands of times.
5. The primary database only handles the real work: about 1,000 hold attempts/second and about 33 purchases/second, which a single well-configured PostgreSQL server can handle.
6. Users who lose a race get a quick, clear `409` message and a refreshed seat map, instead of an error page.

---

## 7. Trade-offs

1. **Stale seat map (cache) vs. real-time accuracy.** Caching the seat map for 1-2 seconds protects the database but can show a seat as free after it was taken. *What we gave up:* perfect freshness; some users get a `409`. *Why acceptable:* the database still decides correctly, so no one is ever double-booked.

2. **Waiting room vs. convenience.** The queue keeps the system alive and the sale fair, but people must wait and may feel frustrated. *What we gave up:* instant access. *Why acceptable:* without it the site could crash and nobody could buy.

3. **Hold duration (5 minutes).** Longer holds give people time to pay, but abandoned holds keep seats locked while others are waiting. *What we gave up:* some seats sit unavailable for a few minutes; the 4-seat limit reduces abuse.

4. **One primary database (strong consistency) vs. horizontal write scaling.** A single primary makes correctness simple, but it is a limit and a single point of failure. *Mitigation:* a replica can be promoted on failure. Writes are small (about 33/second), so this is enough. Sharding by event is the future option if we grow.

5. **More servers cost money.** Extra app servers are rented only around big sales, then removed.

---

## 8. Alternatives Considered

- **Lock a seat in Redis only.** Faster, but if Redis loses data or restarts, two buyers could both think they own the seat. We kept the database as the source of truth and use Redis only as a cache.
- **Sell tickets without choosing seats (general admission counter).** Simpler, but the assignment requires seat selection.
- **Document database.** Our data is highly related (users, events, seats, orders) and needs transactions and constraints, so a relational database fits better.
- **No waiting room, just more servers.** Would be very expensive for 10 minutes a year and would still not make the sale fair.

## 9. Risks and Open Questions

- Payment provider slowdown during a sale could keep holds open longer. *Mitigation:* timeouts and a clear "payment pending" state.
- Bots using many accounts. *Mitigation:* rate limits, CAPTCHA at queue entry, 4-seat limit. Exact rules still to be decided.
- What happens to seats if payment status is unknown for a long time? To be decided: reconcile with the provider's records.
- Monitoring: track error rate, latency (p95), queue length, cache hit rate, database CPU and number of 409 responses, with alerts on each.