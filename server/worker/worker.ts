import { Worker, Queue } from 'bullmq';
import { config } from 'dotenv';
import type { BatchJobData, UrlJobData } from '../shared/config';
import { connection } from '../shared/redisConnection';
import { UrlRepository } from '../src/apps/urlImport/repo/url.repo';
config();

const urlQueue = new Queue<UrlJobData>('url-queue', { connection });

// Add typebox type validation for the job data
const batchWorker = new Worker<BatchJobData>('batch-queue', async (job) => {
    const batchInfo = await UrlRepository.getBatchWithUrls(job.data.batchId);
    if(!batchInfo) {
        return;
    }
    const urls = batchInfo.urls;
    const jobs = await urlQueue.addBulk(urls.map(url => ({
        name: 'url-job',
        data: { url: url.url },
        opts: {
            jobId: url.id,
            backoff: {
                type: 'exponential',
                delay: 1000
            }
        }
    })));
}, {
    connection,
    concurrency: 5
})

const urlWorker = new Worker<UrlJobData>('url-queue', async (job) => {
    const { url } = job.data;
    // If this throws then the job will be retried based on the retry options
    const result = await pingUrl(url);
    return result;
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