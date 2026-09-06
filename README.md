# Bulk URL Health Checker

## 1. What this project builds

This project is a monorepo for a URL health checker dashboard. A user submits a batch of URLs, the backend persists the batch and each individual URL in PostgreSQL, and a worker process checks each URL in the background. The UI shows progress as results arrive and exposes a dedicated page for each batch.

For each URL, the system stores at minimum:
- final HTTP status code
- response time
- page title when available
- current processing state

The app is built with:
- Node.js + TypeScript
- Fastify
- PostgreSQL
- Redis
- BullMQ
- Next.js + TypeScript

---

## 2. Exact command to run the whole system

From the repository root:

```bash
docker compose up --build
```

This starts the full local stack, including:
- PostgreSQL on `localhost:5434`
- Redis on `localhost:6379`
- API instances on `localhost:8001` and `localhost:8002`
- Nginx load balancer on `http://localhost:8080`
- Frontend on `http://localhost:3000`
- BullMQ worker replicas in the background

Useful commands:

```bash
docker compose down

docker compose logs -f

docker compose ps

docker compose build --no-cache
```

---

## 3. Architecture overview

### Frontend
The frontend is a Next.js app with:
- a batch list page
- a batch detail page keyed by its own URL
- client-side state updates for mutation flows
- SSR for initial data fetches when a batch page loads cold

This keeps route-level data addressable and refresh-safe.

### API layer
The API is a Fastify application. It is responsible for:
- accepting a new batch submission
- validating and persisting URLs in PostgreSQL before checks begin
- enqueuing work to Redis/BullMQ
- serving batch list/detail queries
- streaming live updates to the client through SSE
- handling cancel/retry flows and state transitions

### Worker layer
The worker is a separate process from the API. It is responsible for:
- pulling URL jobs from the BullMQ queue
- fetching the target URL with timeout and retry logic
- persisting final result back into PostgreSQL
- honoring global rate limits and concurrency rules
- checking cancellation state before finalizing work

### Data and queue infrastructure
- PostgreSQL is the source of truth for batch and URL state.
- Redis is used for BullMQ queue coordination and cancellation/pub-sub signaling.
- Nginx sits in front of multiple API instances for local horizontal scaling and load balancing.

---

## 4. How submission and background processing work

### Batch submission flow
1. The client submits a list of URLs or a CSV file.
2. The API validates and inserts the batch record.
3. The API inserts each URL row with a batch foreign key and initial state.
4. The API enqueues a batch-processing job.
5. The batch worker loads the batch and creates one URL job per URL record.
6. Each individual URL job is processed independently in the worker pool.

This ensures the batch and URL records exist in PostgreSQL before background checks begin, which keeps the system consistent and recoverable.

### Rate limit, concurrency, and retries
These guarantees are enforced at the queue level and are shared across all worker processes:

- Global rate limit: 10 requests/second across the entire system
- Concurrency: 5 checks in flight at any one time
- Retries: up to 3 retries with exponential backoff on transient failures

Implementation detail:
- The URL queue uses a global rate limit so that the system-level cap is enforced across workers, not per process.
- Worker concurrency is configured so that only a fixed number of jobs run simultaneously.
- Retry behavior is handled by BullMQ with exponential backoff and retry attempt counting.

This still holds correctly when more than one worker instance is running because the queue and Redis coordination are shared across the cluster.

---

## 5. Live updates and refresh safety

The app uses Server-Sent Events (SSE) to push job updates to the browser as each URL completes.

Why SSE was chosen:
- the update flow is server-to-client dominated
- it supports reconnect behavior automatically
- it is simpler than maintaining a polling architecture for each batch page
- it works well for progress-style UI flows

The client listens to the batch stream and updates the page as events arrive, without needing user action.

Refresh-safe behavior:
- the batch page fetches the latest persisted batch state on load
- the page then hydrates from the database rather than trusting stale in-memory client state
- if a batch is mid-flight, the current state is reconstructed from the database and the stream resumes if still connected

Correctness with multiple API instances:
- the source of truth remains PostgreSQL
- each API instance is stateless from a domain perspective
- a reconnect may land on a different instance, but the client rehydrates from persisted state instead of relying on a single instance's memory

Dropped connection recovery:
- the browser reconnects automatically to the SSE stream
- the server resumes the event stream based on the batch identity
- the client refreshes from persisted state if needed so the UI remains correct even after the connection drops

---

## 6. UI requirements and batch addressing

The app includes:
- a list of all batches
- a dedicated page for a single batch
- direct links to each batch so it can be opened in a new tab or shared

Opening a batch URL cold must still work:
- the page fetches the batch and URL data from PostgreSQL
- the UI renders the current state even if the batch is still in progress or already completed
- progress updates continue through the live stream once connected

This is the correct pattern for a refresh-safe dashboard: the database is the source of truth, and the UI is a projection over it.

---

## 7. Cancel and retry controls

### Cancel batch
A cancel operation is designed to handle both queued and in-flight jobs.

Behavior:
- queued URLs are prevented from starting
- in-flight jobs receive an abort signal or cancellation signal
- before saving final result, the worker rechecks whether cancellation was requested
- if cancelled, the job is marked as cancelled instead of completed or failed

This keeps persisted state consistent with what the user sees.

### Retry failed only
The retry action re-runs only URL jobs that are in a failed state.

Behavior:
- successful URLs are not reprocessed
- failed URLs are re-enqueued
- the batch worker rebuilds only the failed subset
- the batch record and each URL row update consistently as the retry runs

This avoids duplicate work and preserves the integrity of the persisted state.

---

## 8. Caching requirement

The batch list endpoint is cached for 30 seconds.

The cache is designed to avoid stale user-visible data by invalidating or refreshing when:
- a new batch is created
- batch state changes
- any related URL result updates

This means we do not serve stale batch lists for long periods. The app remains consistent without needing a full cache invalidation framework beyond the simple TTL + reset strategy described here.

---

## 9. Type safety across client and server

The client and server share typed contracts through a shared package. This avoids duplicated or drifting types between the API and the frontend.

This matters because:
- the batch payloads are passed from the API to the UI
- the same types are used in server-side validation and client-side rendering
- the URL and batch job states are strongly typed across the boundary

That reduces the risk of mismatches between what the UI expects and what the backend actually sends.

---

## 10. How the system behaves when the API is scaled horizontally

When multiple API instances serve traffic, the architecture remains valid because the shared state is in PostgreSQL and Redis, not in individual API memory.

That means:
- batch creation is safe across instances
- queue submission remains consistent because Redis is shared
- single batch pages remain valid because the database is the source of truth
- SSE connections are per-process, so a reconnect may land on a different API instance
- reconciliation after reconnect happens via fresh database reads and stream re-establishment, so the UI remains correct

The main caveat is that SSE is not truly shared across nodes in memory, so reconnecting to a different instance is expected and must be handled by rehydrating from persisted state rather than memory.

---

## 11. Trade-offs and what I would do differently with more time

### Trade-offs made
- Simple local Docker setup instead of a production-hardened deployment
- SSE chosen for live updates because it is straightforward and reliable for this brief
- Redis/BullMQ used for queue durability and job coordination
- PostgreSQL as the single source of truth for correctness and simplicity
- A direct, lightweight app structure rather than an over-engineered distributed system

### What I would do with more time
- move to a more robust SSE/shared-state strategy for multi-node deployments
- add more structured logging and observability
- improve cache invalidation and more extensive Redis-backed caching patterns
- harden the Docker environment for production-like deployment instead of dev-mode startup

---

## 12. Assumptions and deliberate constraints

This project makes the following assumptions:
- maximum retries are set to 3
- only HTTP 500+ status codes and network-level failures are treated as failed work
- successful jobs are not retried
- the rate limit is enforced globally across the URL queue, not per individual worker process
- SSE is causes issues in local development due to browser rules. When opening in multiple tabs browser limits number of simultaneous connections. In production with HTTP/2 multiplexing this shouldn't be an issue.
- the Docker setup is intentionally optimized for quick startup and local development rather than production hardening

---

## 13. Summary

This implementation is designed around a simple but correct principle: PostgreSQL holds the durable truth, Redis/BullMQ coordinates background execution, and the UI reflects the latest persisted state. That makes the system resilient to refreshes, multi-instance API deployments, queue retries, and cancel flows while keeping the architecture understandable and easy to run locally.

---

## 14. Project notes

This repository is intentionally structured as a Bun monorepo. Shared types and cross-package contracts live in the shared workspace so the API, worker, and frontend remain aligned.

The codebase keeps a separation between:
- API server responsibilities
- background worker work
- database persistence
- live UI updates

This separation is important because the evaluation is not only about making the UI work; it is also about proving the system behaves correctly under concurrency, retries, scaling, and state recovery.
