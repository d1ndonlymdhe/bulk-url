# System Architecture & Loom Walkthrough Diagrams

Visual reference diagrams for the 3–5 minute Loom walkthrough.

---

## 1. System Topology

Separation of concerns between the frontend, API server, background worker, and shared state stores.

```mermaid
flowchart LR
    Client["Next.js Frontend<br/>(SSR & Live SSE)"] <-->|"HTTP & SSE"| API["Fastify API Server<br/>(REST & SSE Streams)"]
    API <-->|"Durable State"| DB[("PostgreSQL<br/>(Single Source of Truth)")]
    API <-->|"Jobs & Events"| Redis[("Redis / BullMQ<br/>(Queues & Pub/Sub)")]
    Worker["Background Worker<br/>(10 req/s | 5 concurrent)"] <-->|"Lease & Events"| Redis
    Worker <-->|"Persist Results"| DB
```

---

## 2. Batch Processing Lifecycle

End-to-end lifecycle showing transactional pre-persistence, rate-limited processing, and live SSE streaming.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client (Next.js)
    participant API as Fastify API
    participant DB as PostgreSQL
    participant Queue as BullMQ (Redis)
    participant Worker as Background Worker

    Client->>API: 1. Submit batch (Paste / CSV)
    API->>DB: 2. Persist batch & URLs atomically (Transaction)
    API->>Queue: 3. Enqueue batch job & clear cache
    API-->>Client: 4. Return batchId (Redirect to /batches/:id)

    Queue->>Worker: 5. Fan-out URL jobs (10 req/s, 5 concurrent)
    loop For each URL check
        Worker->>Worker: 6. HTTP ping target (with AbortSignal)
        Worker->>DB: 7. Save status, latency & title
        Worker->>Queue: 8. Emit completion event
        Queue-->>API: 9. Deliver event to API listener
        API-->>Client: 10. Push live SSE update to UI
    end
```

---

## 3. Real-Time Live Updates (SSE)

How worker completion events flow to the browser without client polling.

```mermaid
flowchart LR
    Worker["1. Worker finishes check"] -->|"Emit event"| Redis["2. Redis Event Bus"]
    Redis -->|"Deliver event"| API["3. Fastify API (UserContext)"]
    API -->|"Stream SSE: job-updated"| Client["4. Next.js Client (UI updates)"]
```

---

## 4. Cancellation & Retry Flows

### A. Cancel Batch Flow
Halts both queued and in-flight checks safely.

```mermaid
flowchart LR
    UserCancel["User clicks Cancel"] --> API1["Fastify API"]
    API1 -->|"Redis Pub/Sub"| Worker1["Worker Process"]
    Worker1 -->|"AbortSignal"| Abort["Abort in-flight HTTP"]
    Worker1 -->|"Update DB"| DBCancel[("PostgreSQL: cancelled")]
    DBCancel -->|"SSE push"| UICancel["UI reflects 'cancelled'"]
```

### B. Retry Failed Only Flow
Re-executes only failed URLs without repeating finished work.

```mermaid
flowchart LR
    UserRetry["User clicks Retry Failed"] --> API2["Fastify API"]
    API2 -->|"Enqueue retry"| Worker2["Worker Process"]
    Worker2 -->|"Query failed only"| DBRetry[("PostgreSQL")]
    DBRetry -->|"Re-enqueue failed"| Queue2["BullMQ (failed URLs only)"]
    Queue2 -->|"Untouched"| Done["Successful URLs untouched"]
```

---

## 5. Loom Video Talking Points (3–5 Minutes)

| Time | Topic | Diagram to Show | Key Points to Mention |
| :--- | :--- | :--- | :--- |
| **0:00 - 1:00** | **Architecture & Topology** | Diagram 1 (System Topology) | Core separation: Next.js frontend, Fastify API, PostgreSQL (durable truth), Redis (BullMQ queue & pub/sub), and the isolated background worker process. |
| **1:00 - 1:45** | **Submission & Durability** | Diagram 2 (Batch Lifecycle) | Emphasize **pre-persistence**: batch & URLs are committed in PostgreSQL inside an atomic transaction before queue dispatch. Explain exponential backoff (up to 3 retries). |
| **1:45 - 2:30** | **Rate Limiting & Live Updates** | Diagram 3 (Live Updates via SSE) | Explain that rate limiting (10 req/s) and concurrency (5 in flight) are enforced via BullMQ/Redis. Explain why SSE was chosen over WebSockets (unidirectional, lightweight, auto-reconnect). |
| **2:30 - 3:15** | **Idempotency, Cancel & Retry** | Diagram 4 (Cancel & Retry) | Show how deterministic `jobId: url.id` prevents duplicate jobs. Explain how Cancel uses `AbortSignal` for in-flight requests and DB checks for queued ones. Show "Retry Failed Only" isolating failed work. |
| **3:15 - 4:00** | **Trade-offs & Scaling** | README Sections 10 & 11 | Mention how the stateless API and worker design can easily be scaled horizontally behind a load balancer because state is centralized in PostgreSQL and Redis. |
