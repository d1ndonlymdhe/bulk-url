import { Queue, QueueEvents } from "bullmq";
import { connection } from "../shared/redisConnection";
import { BATCH_QUEUE_NAME, URL_QUEUE_NAME, type BatchJobData, type UrlJobData } from "../shared/config";
import { UrlRepository } from "./apps/urlImport/repo/url.repo";
import { ActiveUrlJobsContext } from "./apps/context/jobsContext";

export const batchQueue = new Queue<BatchJobData>(BATCH_QUEUE_NAME, { connection })

export const urlQueue = new Queue<UrlJobData, string>(URL_QUEUE_NAME, { connection })

const urlQueueEvents = new QueueEvents(URL_QUEUE_NAME, { connection });

urlQueueEvents.on('completed', async (job) => {
    console.log(`Job ${job.jobId} has completed!`);
    const completedUrl = await UrlRepository.getUrl(job.jobId);
    if (completedUrl) {
        // Notify the job context that the job is complete
        ActiveUrlJobsContext.completeJob(job.jobId, completedUrl);
    }
})