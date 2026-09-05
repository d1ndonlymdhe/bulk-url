import { Worker, Queue, QueueEventsProducer } from 'bullmq';
import { config } from 'dotenv';
import {
    BATCH_QUEUE_NAME,
    BULLMQ_QUEUE_EVENT_NAMES,
    MAX_URL_RETRIES,
    URL_QUEUE_NAME,
    type BatchJobData,
    type UrlJobData,
} from '@myapp/shared/config';
import { connection } from '../shared/redisConnection';
import { UrlRepository } from '../src/apps/urlImport/repo/url.repo';
import db from '../src/drizzle';

// node-redis is recommended but bullmq already uses ioredis using that
import { Redis } from 'ioredis';
config();

const redisConnection = new Redis({
    host: connection.host,
    port: connection.port,
})


const urlQueueEventsProducer = new QueueEventsProducer(URL_QUEUE_NAME, { connection })
const urlQueue = new Queue<UrlJobData>(URL_QUEUE_NAME, { connection });


// Set a global rate limit of 10 jobs per second for the URL queue (at most 10 urls can be processed per second)
urlQueue.setGlobalRateLimit(10, 1000)

const batchWorker = new Worker<BatchJobData>(BATCH_QUEUE_NAME, async (job) => {
    const queuedUrls = await UrlRepository.getUrlsToProcessFromBatch(job.data.batchId);
    if (!queuedUrls) {
        return;
    }
    if (job.data.forceRetry) {
        db.transaction(async (tx) => {
            const failedUrls = await UrlRepository.getFailedUrlsFromBatch(job.data.batchId, tx);
            if (failedUrls) {
                await urlQueue.addBulk(failedUrls.urls.map(url => ({
                    name: 'url-job',
                    data: {
                        url: url.url,
                    },
                    opts: {
                        jobId: url.id,
                        attempts: MAX_URL_RETRIES,
                        backoff: {
                            type: 'exponential',
                            delay: 1000,
                        },
                        removeOnFail: true,
                    }
                })));
                const updatedUrls = await UrlRepository.requeueUrls(failedUrls.urls.map(url => url.id), tx);
                const urlIds = updatedUrls.map(url => url.id);
                await urlQueueEventsProducer.publishEvent({ eventName: BULLMQ_QUEUE_EVENT_NAMES.BATCH_UPDATED, affectedUrlIds: JSON.stringify(urlIds) })
            }
        })
    }
    // always add the queued urls to the list of urls to process
    if (queuedUrls) {
        const jobs = await urlQueue.addBulk(queuedUrls.urls.map(url => ({
            name: 'url-job',
            data: {
                url: url.url,
            },
            opts: {
                jobId: url.id,
                attempts: MAX_URL_RETRIES,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnFail: true
            }
        })));
    }
}, {
    connection,
})

const urlWorker = new Worker<UrlJobData>(URL_QUEUE_NAME, async (job, _token, signal) => {
    try {
        if (signal) {
            console.log(`Signal received for job ${job.id}: ${signal.aborted}`);
        }
        const { url } = job.data;
        // Check if the job has been cancelled before proceeding
        let alreadyCancelled = await UrlRepository.isJobCancelled(job.id!);
        if (alreadyCancelled) {
            return;
        }
        await UrlRepository.markAsStarted(job.id!)
        urlQueueEventsProducer.publishEvent({ eventName: BULLMQ_QUEUE_EVENT_NAMES.URL_STARTED, jobId: job.id! })
        const result = await pingUrl(url, signal);
        // Check again if the job has been cancelled before marking it as complete
        alreadyCancelled = await UrlRepository.isJobCancelled(job.id!);
        if (alreadyCancelled) {
            return;
        }
        await UrlRepository.markAsComplete(job.id!, result.title, result.duration, result.status);
        return;
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            // This doesn't throw an error
            console.log("THE FETCH WAS ABORTED")
            return;
        } else {
            // Record as failed
            const alreadyCancelled = await UrlRepository.isJobCancelled(job.id!);
            if (alreadyCancelled) {
                return;
            }
            await UrlRepository.markAsFailed(job.id!);
            throw err;
        }
    }
}, {
    connection,
    concurrency: 5
})


redisConnection.subscribe('batch-cancel-event', (err, count) => {
    if (err) {
        console.error('Failed to subscribe: %s', err.message);
    } else {
        console.log(`Subscribed successfully! This client is currently subscribed to ${count} channels.`);
    }
})

redisConnection.on('message', async (channel, batchId) => {
    if (channel === 'batch-cancel-event') {
        const batch = await UrlRepository.getBatchWithUrls(batchId);
        const cancelledUrlsIds = await UrlRepository.markBatchAsCancelled(batchId);
        if (batch) {
            const urlIds = batch.urls.map(url => url.id);
            for (const urlId of urlIds) {
                urlWorker.cancelJob(urlId);
            }
        }
        await urlQueueEventsProducer.publishEvent({ eventName: BULLMQ_QUEUE_EVENT_NAMES.BATCH_UPDATED, affectedUrlIds: JSON.stringify(cancelledUrlsIds) })
    }
})

async function pingUrl(url: string, signal: AbortSignal | undefined) {
    const time = Date.now();
    const response = await fetch(url, { signal });
    const contentType = response.headers.get('content-type');
    const html = await response.text();
    let title = null as string | null;
    if (contentType && contentType.includes('text/html')) {
        // Extract the title from the HTML content
        const titleMatch = html.match(/<title>(.*?)<\/title>/);
        title = titleMatch ? titleMatch[1] ? titleMatch[1] : null : null;
    }
    const status = response.status;
    const duration = Date.now() - time;
    return {
        status,
        duration,
        title
    }
}


process.on("SIGTERM", async () => {
    await batchWorker.close();
    await urlWorker.close();
    await urlQueue.close();
    process.exit(0);
});