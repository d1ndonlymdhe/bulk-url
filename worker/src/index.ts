import { Worker, Queue, QueueEventsProducer } from 'bullmq';
import { config } from 'dotenv';
import { Redis } from 'ioredis';
import {
    BATCH_QUEUE_NAME,
    BULLMQ_QUEUE_EVENT_NAMES,
    MAX_URL_RETRIES,
    URL_QUEUE_NAME,
    type BatchJobData,
    type UrlJobData,
} from '@myapp/shared/config';
import { UrlRepository } from '@myapp/db';
import { connection } from '@myapp/shared/redisConnection';

config();

const redisConnection = new Redis({
    host: connection.host,
    port: connection.port,
});

const urlQueueEventsProducer = new QueueEventsProducer(URL_QUEUE_NAME, { connection });
const urlQueue = new Queue<UrlJobData>(URL_QUEUE_NAME, { connection });

await urlQueue.setGlobalConcurrency(5);
await urlQueue.setGlobalRateLimit(10, 1000);

const batchWorker = new Worker<BatchJobData>(BATCH_QUEUE_NAME, async (job) => {
    const queuedUrls = await UrlRepository.getUrlsToProcessFromBatch(job.data.batchId);
    if (!queuedUrls) return;

    if (job.data.forceRetry) {

        const failedUrls = await UrlRepository.getFailedUrlsFromBatch(job.data.batchId);
        if (failedUrls) {
            const updatedUrls = await UrlRepository.requeueUrls(failedUrls.urls.map((url) => url.id));
            const urlIds = updatedUrls.map((url) => url.id);
            console.log(`Re-queued ${urlIds.length} failed urls for batch ${job.data.batchId}`);

            for(const urlId of urlIds) {
                const job = await urlQueue.getJob(urlId);
                if(job){
                    await job.remove();
                }
            }

            await urlQueue.addBulk(failedUrls.urls.map((url) => ({
                name: 'url-job',
                data: { url: url.url },
                opts: {
                    jobId: url.id,
                    attempts: MAX_URL_RETRIES,
                    backoff: { type: 'exponential', delay: 1000 },
                    removeOnFail: false,
                },
            })));

            await urlQueueEventsProducer.publishEvent({
                eventName: BULLMQ_QUEUE_EVENT_NAMES.BATCH_UPDATED,
                affectedUrlIds: JSON.stringify({
                    data: urlIds,
                }),
            });
        }
    }

    if (queuedUrls) {
        await urlQueue.addBulk(queuedUrls.urls.map((url) => ({
            name: 'url-job',
            data: { url: url.url },
            opts: {
                jobId: url.id,
                attempts: MAX_URL_RETRIES,
                backoff: { type: 'exponential', delay: 1000 },
                removeOnFail: false,
            },
        })));
    }
}, { connection });

const urlWorker = new Worker<UrlJobData>(URL_QUEUE_NAME, async (job, _token, signal) => {
    try {
        const { url } = job.data;
        let alreadyCancelled = await UrlRepository.isJobCancelled(job.id!);
        if (alreadyCancelled) {
            console.log(`Job ${job.id!} was already cancelled.`);
            await urlQueueEventsProducer.publishEvent({ eventName: BULLMQ_QUEUE_EVENT_NAMES.URL_UPDATED, jobId: job.id!, status: 'cancelled' });
            return;
        }
        console.log(`Processing job ${job.id!} for URL: ${url}`);
        await UrlRepository.markAsStarted(job.id!);
        await urlQueueEventsProducer.publishEvent({ eventName: BULLMQ_QUEUE_EVENT_NAMES.URL_UPDATED, jobId: job.id!, status: 'processing' });

        const result = await pingUrl(url, signal);

        alreadyCancelled = await UrlRepository.isJobCancelled(job.id!);
        if (alreadyCancelled) {
            await urlQueueEventsProducer.publishEvent({ eventName: BULLMQ_QUEUE_EVENT_NAMES.URL_UPDATED, jobId: job.id!, status: 'cancelled' });
            return;
        }

        await UrlRepository.markAsComplete(job.id!, result.title, result.duration, result.status);
        await urlQueueEventsProducer.publishEvent({ eventName: BULLMQ_QUEUE_EVENT_NAMES.URL_UPDATED, jobId: job.id!, status: 'complete' });

        return;

    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            await UrlRepository.markAsCancelled(job.id!);
            await urlQueueEventsProducer.publishEvent({ eventName: BULLMQ_QUEUE_EVENT_NAMES.URL_UPDATED, jobId: job.id!, status: 'cancelled' });
            return;
        }
        const cancelled = await UrlRepository.isJobCancelled(job.id!);
        if (cancelled) {
            await urlQueueEventsProducer.publishEvent({ eventName: BULLMQ_QUEUE_EVENT_NAMES.URL_UPDATED, jobId: job.id!, status: 'cancelled' });
            return;
        }
        const updated = await UrlRepository.markAsFailed(job.id!);
        await urlQueueEventsProducer.publishEvent({ eventName: BULLMQ_QUEUE_EVENT_NAMES.URL_UPDATED, jobId: job.id!, status: updated!.jobStatus });
        throw err;
    }
}, { connection, concurrency: 5});

redisConnection.subscribe('batch-cancel-event', (err, count) => {
    if (err) {
        console.error('Failed to subscribe: %s', err.message);
    } else {
        console.log(`Subscribed successfully! This client is currently subscribed to ${count} channels.`);
    }
});

redisConnection.on('message', async (channel, batchId) => {
    if (channel === 'batch-cancel-event') {
        const batch = await UrlRepository.getBatchWithUrls(batchId);
        const cancelledUrlIds = await UrlRepository.markBatchAsCancelled(batchId);
        if (batch) {
            for (const urlId of batch.urls.map((url) => url.id)) {
                urlWorker.cancelJob(urlId);
            }
        }
        await urlQueueEventsProducer.publishEvent({
            eventName: BULLMQ_QUEUE_EVENT_NAMES.BATCH_UPDATED,
            affectedUrlIds: JSON.stringify({
                data: cancelledUrlIds,
            }),
        });
    }
});

async function pingUrl(url: string, signal: AbortSignal | undefined) {
    const time = Date.now();
    const response = await fetch(url, { signal });
    const contentType = response.headers.get('content-type');
    const html = await response.text();
    let title: string | null = null;

    if (contentType && contentType.includes('text/html')) {
        const titleMatch = html.match(/<title>(.*?)<\/title>/);
        title = titleMatch ? (titleMatch[1] ? titleMatch[1] : null) : null;
    }

    const status = response.status;
    const duration = Date.now() - time;
    // Treating 5xx as hard failures
    if (status >= 500) {
        throw new Error(`Server error: ${status}`);
    }
    return { status, duration, title };
}

process.on('SIGTERM', async () => {
    await batchWorker.close();
    await urlWorker.close();
    await urlQueue.close();
    process.exit(0);
});
