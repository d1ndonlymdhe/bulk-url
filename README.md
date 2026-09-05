# Bulk URL

This repository is a Bun monorepo for a URL processing app with:
- a Next.js frontend
- a Fastify API server
- multiple API instances behind Nginx
- BullMQ workers
- PostgreSQL and Redis backing services

## One-click startup

From the repo root run:

```bash
docker compose up --build
```
This waits for required images to run so wait 10-15 seconds before starting the application.

This will start:
- PostgreSQL on `localhost:5434`
- Redis on `localhost:6379`
- API instances on `localhost:8001` and `localhost:8002`
- Nginx load balancer on `http://localhost:8080`
- Frontend on `http://localhost:3000`
- Worker replicas in the background

## Where to access the app

- Frontend: http://localhost:3000
- API via Nginx: http://localhost:8080
- Direct API instance 1: http://localhost:8001
- Direct API instance 2: http://localhost:8002

The frontend is configured to call the API through Nginx, while server-side/SSR requests use the internal Docker service name.

## Notes on the Docker setup


This project is intentionally set up as a local development stack, not as a production-optimized container build.

Important details:
- Dockerfiles are kept simple
- Bun dependencies are installed in the images
- applications run in dev mode rather than production mode
- worker processes are not tuned for production scale or memory optimization
- the goal is fast local startup, not production hardening

In particular:
- the frontend runs with `next dev`
- the API runs with Bun directly
- the worker runs directly with Bun
- the database migration step is a one-off startup job before the API and workers begin serving traffic

## Useful commands

Start everything:

```bash
docker compose up --build
```

Stop everything:

```bash
docker compose down
```

Rebuild without cache:

```bash
docker compose build --no-cache
```

View logs:

```bash
docker compose logs -f
```

Check running containers:

```bash
docker compose ps
```

## Infrastructure summary

- PostgreSQL: shared DB for batches and URLs
- Redis: queue coordination and cancellation notification
- Nginx: simple round-robin load balancer for API replicas
- Workers: consume background queue jobs
- Frontend: Next.js app for browser interaction

## Important caveat

This is a development-oriented environment. It is not intended to be a fully optimized production Docker deployment.

## Project Structure
- BunJS monorepo, db repositories are shared between worker and api server
- For Type sharing between worker, server and client the `shared` directory/ sub-repo is used.
 

## Frontend (Client structure)
- Initial Get requests are Server Side fetched, Example: the data for rendering all the batches in the server
- For mutations client side capabilities are used (Tanstack React Query), gives an standard pattern for mutations
- Clear Separation of client and server concerns
- The frontend design was AI generated but parts concerning the job progress is hand rolled.

## Api Server
- Fastify api server
- All routes are registered in `src/server.ts` file.
- Two routes `/test-endpoint/<wait-time>` and `/test-endpoint/<wait-time>/fail` to wait and response, and wait and fail after some time.
- Drizzle was used as an ORM.
- Caching:
    - The exiting redis connection was used for caching.

## Transport Mechanism
- The worker and Api server communicate via BullMQ (Redis). The ioredis (legacy) library was used because this was already chosen by bull MQ.
- The Api server pushes events to client via SSE (Server Sent Events).
    - The client doesn't have to send much data to the server, the event flow is mostly from server to client.
    - SSE gives auto reconnect and is optimized for server to client direction compared to websockets or polling
    - The events are simple, an job updated event which pushes the latest state of an url job.

## Worker
- All worker definition in `src/index.ts` file
- For global rate limiting built in BullMQ functionality is used.`urlQueue.setGlobalRateLimit(10, 1000);`
- Two Queues Batch Queue and Url Queue.
    - Each url is processed separately.
    - The api server submits batchIds to process.
    - The batch queue worker takes the batchId and passes urls to urlWorker
    - The rate limit is not applied on the batch queue.
- The postgres database is always the source of truth.
    - The batch worker only takes `batchid` and reads complete data from the database.
    - The url worker again checks the database if the job is cancelled before proceeding.
- Deduplication
    - The job id for url worker is the url id that is stored in the database. So submitting two jobs is deduplicated.
- Concurrency
    - Concurrency is controlled by the concurrency parameter

## Horizontal Scaling
The Redis Queue and Postgres database are the source of truth so the server is mostly stateless which is ideal for Horizontal scaling.  

One issue is SSE. The SSE connection will be scoped per each server in memory. That too in the current architecture the SSEContext in the frontend only works on one route, so on refresh or navigation should resolve automatically.  
One auto browser reconnect, the stream may land on a different API server which causes problems. 


## How AI was used
- Before starting this project I had very little knowledge of Redis and BullMQ. AI helped me learn the basis real quick.
- The Frontend Design was AI generated.
- AI was used to convert project into a monorepo.
- AI was used to generate the configuration for one click docker compose.
- In Conclusion AI was used more as a learning tool for this project.

## Assumptions:
- Max Retries is set as 3.
- Only Status 500+ are marked as failures, for failed requests no data is stored (Response time, title ....) 
- Only failed jobs can be retried,Completed actions cannot be retried.
- Rate limit is applied across workers but only in the url queue
- SSE is used for development, which has limits in local development.
    - Browsers limit SSE connections by domain, so opening 4+ tabs breaks the setup.
    - But in production environments SSE supports HTTP/2 multiplexing which allows multiple tabs to share the same underlying TCP connection and allows more connections
- For easier setup, the docker scripts/images are not optimized and run in dev mode instead of build mode. 
- Caching:
    - Only the get all batches endpoints was cached with a 30 seconds TTL, which is reset when new Batch is created.
    - No update / delete endpoint for batches

## Further upgrades
- Extended caching mechanism
    - The Redis cache mechanism should be upgraded to handle more data and support the workers
- Extended type safety while communicating between API server and Workers
- Upgrade the docker setup for optimized images.
- With few upgrades it is possible to track each URL job individually
- There can be many hidden bugs (unknown unknowns), the logging should be increased.
- Utilize Redis for shared SSE state.
