import { Worker, Queue, QueueEventsProducer } from 'bullmq';
import { config } from 'dotenv';
import { BATCH_QUEUE_NAME, MAX_URL_RETRIES, URL_QUEUE_NAME, type BatchJobData, type UrlJobData } from '../shared/config';
import { connection } from '../shared/redisConnection';
import { UrlRepository } from '../src/apps/urlImport/repo/url.repo';
import db from '../src/drizzle';
config();



const urlQueueEventsProducer = new QueueEventsProducer(URL_QUEUE_NAME, { connection })
const urlQueue = new Queue<UrlJobData>(URL_QUEUE_NAME, { connection });


// Set a global rate limit of 10 jobs per second for the URL queue (at most 10 urls can be processed per second)
urlQueue.setGlobalRateLimit(10, 1000)
// Set a global concurrency of 5 for the URL queue (at most 5 urls can be processed at the same time)
urlQueue.setGlobalConcurrency(5)


// Add typebox type validation for the job data
const batchWorker = new Worker<BatchJobData>(BATCH_QUEUE_NAME, async (job) => {
    const queuedUrls = await UrlRepository.getQueuedUrlsFromBatch(job.data.batchId);
    if (!queuedUrls) {
        return;
    }
    if (job.data.forceRetry) {
        db.transaction(async (tx) => {

            const failedUrls = await UrlRepository.getFailedUrlsFromBatch(job.data.batchId, tx);
            if (failedUrls) {
                await UrlRepository.requeueUrls(failedUrls.urls.map(url => url.id), tx);
                await urlQueue.addBulk(failedUrls.urls.map(url => ({
                    name: 'url-job',
                    data: {
                        url: url.url,
                        // forceRetry: url.forceRetry
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
        })
    }
    // always add the queued urls to the list of urls to process
    if (queuedUrls) {
        const jobs = await urlQueue.addBulk(queuedUrls.urls.map(url => ({
            name: 'url-job',
            data: {
                url: url.url,
                // forceRetry: url.forceRetry
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
    concurrency: 5
})

const urlWorker = new Worker<UrlJobData>('url-queue', async (job) => {
    try {
        const { url } = job.data;
        await UrlRepository.markAsStarted(job.id!)
        urlQueueEventsProducer.publishEvent({ eventName: "url-started", jobId: job.id! })
        const result = await pingUrl(url);
        await UrlRepository.markAsComplete(job.id!, result.title, result.duration, result.status);
        return result;
    } catch (err) {
        // Record as failed
        await UrlRepository.markAsFailed(job.id!);
        throw err;
    }
}, {
    connection,
    concurrency: 5,
})


async function pingUrl(url: string) {
    const time = Date.now();
    const response = await fetch(url);
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