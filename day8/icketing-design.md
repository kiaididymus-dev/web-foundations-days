# TicketHub Design

TicketHub is a website that sells tickets for concerts and events.

## 1. Requirements

### Functional
- Users can sign up and log in.
- Users can browse events and see event details.
- Users can view the seat map of an event with each seat's status (available, held, sold).
- Users can hold seats for a short time while they pay.
- Users can pay for held seats and receive tickets.
- Users can view their tickets and orders.

### Non-functional
- **Correctness (most important):** a seat must never be sold to two people.
- **Fairness:** buyers are served roughly first come, first served. A single user or bot cannot grab many seats, and a long queue does not break the site.
- **Speed:** pages load in under 1 second on a normal day, and seat maps in under 2 seconds during a sale.
- **Availability:** the site stays up during a big sale, and if it is slow it degrades gracefully (a waiting room, not a crash).
- **Durability:** a paid order is never lost.
- **Security:** card payments go through a payment provider, passwords are hashed, and all traffic uses HTTPS.

## 2. Estimates

### Facts
- 2,000,000 registered users
- Normal day: 50,000 visitors x 10 pages = 500,000 page views, and 5,000 tickets sold
- Big sale: 200,000 people try to buy 20,000 seats within the first 10 minutes (600 seconds)
- Assumptions: peak is 5x the average; during the big sale each person makes about 10 requests (seat map refreshes and hold attempts); 1 day = 86,400 seconds

### Normal traffic
- Page views: 500,000 / 86,400 = **about 6 per second** on average, **about 29 per second** at peak (5x)
- Tickets sold: 5,000 / 86,400 = **about 0.06 per second** (one every 17 seconds), about 0.3 per second at peak
- Storage: 5,000 orders/day x 365 = 1.8 million orders/year x about 1 KB = **about 2 GB per year**, which is tiny

### Big sale (first 10 minutes)
- People arriving: 200,000 / 600 = **about 333 per second**
- Requests: 200,000 x 10 = 2,000,000 requests / 600 = **about 3,300 requests per second**
- Hold attempts: about 333 per second, but only 20,000 seats exist, so successful holds are about **33 per second**. Most attempts must fail fast with "seat taken".

### Comparison
The big sale has about **575 times** more requests per second than a normal day (3,300 vs 6), and about **115 times** more than the normal-day peak (3,300 vs 29). Buying also jumps from 0.06 to about 33 successful holds per second. We cannot design for the average day. The system must be built for the sale, and the sale lasts only minutes, so extra capacity should be temporary.

## 3. API

Base URL: `/api/v1`. Requests except browsing need `Authorization: Bearer <token>`.

| Method | Path | Description | Success |
|--------|------|-------------|---------|
| GET | `/events` | List events (`?page=1&limit=20`) | 200 OK |
| GET | `/events/{id}` | Event details | 200 OK |
| GET | `/events/{id}/seats` | Seat map with each seat's status | 200 OK |
| POST | `/events/{id}/holds` | Hold one or more seats for 10 minutes | 201 Created |
| DELETE | `/holds/{holdId}` | Release held seats | 204 No Content |
| POST | `/orders` | Pay for held seats and create an order | 201 Created |
| GET | `/users/me/orders` | View my orders and tickets | 200 OK |

### Hold seats: `POST /events/42/holds`
Request:
```json
{ "seatIds": [1201, 1202] }
```
Response `201 Created`:
```json
{ "holdId": "h_9f3a", "seatIds": [1201, 1202], "expiresAt": "2026-10-25T18:10:00Z" }
```

### Pay: `POST /orders`
Header: `Idempotency-Key: 6f1c...` (a retry never charges twice)
Request:
```json
{ "holdId": "h_9f3a", "paymentToken": "tok_abc123" }
```
Response `201 Created`:
```json
{ "orderId": 5001, "status": "paid", "seats": [1201, 1202], "totalCents": 1500000 }
```

### Errors
- `400 Bad Request`: invalid request (no seats in the list, more than 6 seats)
- `401 Unauthorized`: missing or invalid token
- `404 Not Found`: the event or hold does not exist
- `409 Conflict`: a seat is already held or sold
- `410 Gone`: the hold has expired
- `402 Payment Required`: the payment failed
- `429 Too Many Requests`: the user or IP exceeded the rate limit

## 4. Data model

### Tables
- **users**: `id` (PK), `name`, `email` (UNIQUE), `password_hash`, `created_at`
- **events**: `id` (PK), `name`, `venue`, `starts_at`, `sale_starts_at`
- **orders**: `id` (PK), `user_id` (FK to users), `event_id` (FK to events), `status`, `total_cents`, `payment_ref` (UNIQUE), `created_at`
- **seats**: `id` (PK), `event_id` (FK to events), `section`, `row_label`, `seat_number`, `price_cents`, `status` (available, held, sold), `held_by` (FK to users, nullable), `hold_expires_at`, `order_id` (FK to orders, nullable)

### Relationships
- One user has many orders (one-to-many).
- One event has many seats (one-to-many) and many orders (one-to-many).
- One order has many seats (one-to-many): `seats.order_id` points to the order. A seat belongs to **at most one** order, because it is a single column on the seat row.
- Users and events are many-to-many through orders.

```sql
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id             BIGSERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  venue          TEXT NOT NULL,
  starts_at      TIMESTAMP NOT NULL,
  sale_starts_at TIMESTAMP NOT NULL
);

CREATE TABLE orders (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id),
  event_id    BIGINT NOT NULL REFERENCES events(id),
  status      TEXT NOT NULL CHECK (status IN ('paid', 'refunded')),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  payment_ref TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE seats (
  id              BIGSERIAL PRIMARY KEY,
  event_id        BIGINT NOT NULL REFERENCES events(id),
  section         TEXT NOT NULL,
  row_label       TEXT NOT NULL,
  seat_number     INTEGER NOT NULL,
  price_cents     INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available', 'held', 'sold')),
  held_by         BIGINT REFERENCES users(id),
  hold_expires_at TIMESTAMP,
  order_id        BIGINT REFERENCES orders(id),
  UNIQUE (event_id, section, row_label, seat_number)
);

CREATE INDEX idx_seats_event_status ON seats(event_id, status);
```

## 5. How double-booking is prevented

Two people clicking the same seat at the same moment is the main risk. The database, not the application, makes the final decision, using these layers:

1. **Atomic conditional update.** A hold is one `UPDATE` that only succeeds if the seat is still free:
```sql
   BEGIN;
   UPDATE seats
   SET status = 'held', held_by = :user_id,
       hold_expires_at = now() + interval '10 minutes'
   WHERE event_id = :event_id
     AND id IN (:seat_ids)
     AND (status = 'available'
          OR (status = 'held' AND hold_expires_at < now()));
   -- If rows updated <> number of seats requested: ROLLBACK and return 409.
   COMMIT;
```
   The database locks the seat row while one transaction changes it. The second person's `UPDATE` waits, then sees the seat is no longer available, updates 0 rows, and receives `409 Conflict`. Only one request can win.
2. **Transactions.** If a user asks for 3 seats and one is taken, the whole transaction rolls back, so nobody gets a partial hold.
3. **Holds with expiry.** A held seat belongs to one user for 10 minutes. If they do not pay, the hold expires and the seat becomes available again.
4. **Re-check at payment.** Paying runs another transaction that only marks seats `sold` if they are still held by this user and not expired:
```sql
   BEGIN;
   INSERT INTO orders (user_id, event_id, status, total_cents, payment_ref)
   VALUES (:user_id, :event_id, 'paid', :total, :payment_ref);

   UPDATE seats
   SET status = 'sold', order_id = :order_id
   WHERE id IN (:seat_ids)
     AND status = 'held'
     AND held_by = :user_id
     AND hold_expires_at > now();
   -- If rows updated <> number of seats: ROLLBACK and refund or return 410.
   COMMIT;
```
5. **Constraints.** Each seat is exactly one row (`UNIQUE` on event, section, row and number), and `order_id` is a single column, so a seat cannot belong to two orders. The `CHECK` on `status` blocks invalid states.
6. **Idempotency and unique payment reference.** `payment_ref` is `UNIQUE` and the `Idempotency-Key` header means a retried request cannot create a second order.
7. **Single source of truth.** All seat decisions use the **primary database**. The cache and read replicas only help display the seat map; they are never used to decide whether a seat is free.

## 6. Architecture

```text
                    +-----------+
                    |   Users   |
                    +-----+-----+
                          |
                          v
                    +-----------+
                    |    DNS    |
                    +-----+-----+
                          |
                          v
        +---------------------------------+
        | CDN (pages, images, JS, CSS)    |
        | + rate limiting / bot protection|
        +----------------+----------------+
                         |
                         v
                +------------------+
                |  Waiting room    |  (admits users at a safe rate)
                +--------+---------+
                         |
                         v
                +------------------+
                |  Load balancer   |
                +----+----+----+---+
                     |    |    |
                     v    v    v
                +------+ +------+ +------+
                | App  | | App  | | App  |   (stateless, auto-scaled)
                +--+---+ +--+---+ +--+---+
                   |        |        |
        +----------+--------+--------+----------+
        |                   |                   |
        v                   v                   v
  +-----------+     +---------------+      +-----------+
  |   Cache   |     |   Database    |      |   Queue   |
  | (events,  |     |   (primary)   |      +-----+-----+
  | seat map, |     | seats, orders |            |
  | 1-2s TTL) |     +-------+-------+            v
  +-----------+             |              +-----------+
                            | replication  |  Workers  |
                            v              | (emails,  |
                    +---------------+      |  tickets, |
                    | Read replica  |      |  cleanup) |
                    | (browsing)    |      +-----+-----+
                    +---------------+            |
                                                 v
  +-------------------+                    +-----------+
  | Payment provider  |<-------------------|  App/     |
  | (external)        |                    |  Workers  |
  +-------------------+                    +-----------+
```

### Components
- **DNS:** finds our servers and can route traffic to healthy locations.
- **CDN:** serves static files and event pages from locations near users, so most of the 3,300 requests per second never reach our servers.
- **Rate limiting and bot protection:** limits requests per user and IP, so bots cannot flood the sale or hoard seats, which protects fairness.
- **Waiting room:** puts people in a queue and lets them in at a rate the system can handle, so the database is never hit by all 200,000 at once.
- **Load balancer:** spreads requests across app servers and skips any that fail.
- **App servers:** run the API logic (browse, hold, pay), keep no user data locally, and can be added quickly before a sale.
- **Cache:** stores event pages and the seat map for 1 to 2 seconds, so thousands of seat map views do not each hit the database.
- **Primary database:** the single source of truth for seats and orders, where all holds and sales happen.
- **Read replica:** serves browsing queries (events, history), so they do not compete with seat updates.
- **Queue and workers:** handle slow work (confirmation emails, ticket PDFs, releasing expired holds) outside the purchase request.
- **Payment provider:** an external service handles card payments, so we never store card details.

### How it survives the big sale
- The **CDN** and **cache** absorb most of the 3,300 requests per second, because most are page loads and seat map views.
- The **waiting room** limits how many users reach the app at once, so write load stays near the 33 successful holds per second (plus failed attempts) that one primary database can handle.
- **Auto-scaling** adds app servers before the sale starts, and we **load test** beforehand.
- **Failed attempts are cheap:** after the 20,000 seats are gone, hold attempts return `409` quickly, and the site can show "Sold out".
- **Rate limits** keep bots from using up the capacity.
- **Single points of failure:** multiple app servers, a redundant load balancer, a database replica ready to take over, and a cache that falls back to the database.

## 7. Trade-offs

1. **Waiting room: protection vs convenience.** It protects the system and makes sales fairer, but users wait and some will be frustrated. Without it the site would crash for everyone.
2. **Short cache: speed vs fresh data.** A 1 to 2 second cache of the seat map massively reduces database load, but a user might click a seat that was just taken. This is acceptable, because the database checks again when holding and returns `409`.
3. **Hold time (10 minutes): fairness to buyers vs seat availability.** A long hold gives people time to pay, but lets someone block seats without buying. We chose 10 minutes and expire holds automatically.
4. **One primary database: correctness vs scale.** Sending all seat decisions to one primary is simpler and guarantees no double-booking, but it caps write throughput. Our load (about 33 successful holds per second) fits comfortably, and we can partition by event later.