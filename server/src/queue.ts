import { Queue, QueueEvents, type QueueEventsListener } from "bullmq";
import { connection } from "../shared/redisConnection";
import { BATCH_QUEUE_NAME, URL_QUEUE_NAME, type BatchJobData, type UrlJobData } from "../shared/config";
import { UrlRepository } from "./apps/urlImport/repo/url.repo";
import { ActiveUrlJobsContext } from "./apps/context/jobsContext";

export const batchQueue = new Queue<BatchJobData>(BATCH_QUEUE_NAME, { connection })

export const urlQueue = new Queue<UrlJobData, string>(URL_QUEUE_NAME, { connection })

const urlQueueEvents = new QueueEvents(URL_QUEUE_NAME, { connection });


interface UrlStartedListener extends QueueEventsListener {
    'url-started': (args: { jobId: string }, id: string) => void
}

urlQueueEvents.on('completed', async (job) => {
    console.log(`Job ${job.jobId} has completed!`);
    const completedUrl = await UrlRepository.getUrl(job.jobId);
    if (completedUrl) {
        // Notify the job context that the job is complete
        ActiveUrlJobsContext.jobCompleted(job.jobId, completedUrl);
    }
})


urlQueueEvents.on('failed', async (job) => {
    console.log(`Job ${job.jobId} has failed!`);
    const failedUrl = await UrlRepository.getUrl(job.jobId);
    // same event for the consumer
    if (failedUrl) {
        // Notify the job context that the job is complete
        ActiveUrlJobsContext.jobCompleted(job.jobId, failedUrl);
    }
})

urlQueueEvents.on<UrlStartedListener>('url-started', async ({ jobId }: { jobId: string }) => {
    console.log(`Job ${jobId} has started`);
    const jobInfo = await UrlRepository.getUrl(jobId);
    if (jobInfo) {
        ActiveUrlJobsContext.jobStarted(jobId, jobInfo);
    }
})


urlQueueEvents.on("failed", async (job) => {
    console.log(job.jobId);
})