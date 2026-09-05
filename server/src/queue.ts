import { Queue, QueueEvents, type QueueEventsListener } from "bullmq";
import { connection } from "@myapp/shared/redisConnection";
import { BATCH_QUEUE_NAME, BULLMQ_QUEUE_EVENT_NAMES, URL_QUEUE_NAME, type BatchJobData, type UrlJobData, type UrlUpdatedQueueEvent } from "@myapp/shared/config";
import { UrlRepository } from "@myapp/db";
import { ActiveUrlJobsContext } from "./apps/context/jobsContext";

export const batchQueue = new Queue<BatchJobData>(BATCH_QUEUE_NAME, { connection })

export const urlQueue = new Queue<UrlJobData, string>(URL_QUEUE_NAME, { connection })

const urlQueueEvents = new QueueEvents(URL_QUEUE_NAME, { connection });


interface CustomEventsListener extends QueueEventsListener {
    [BULLMQ_QUEUE_EVENT_NAMES.URL_UPDATED]: (args: UrlUpdatedQueueEvent, id: string) => void
    // Parse as JSON array
    /**
     * Real payload shape:
     * {
     *  data: string[]
     * }
     * @param args 
     * @param id 
     * @returns 
     */
    [BULLMQ_QUEUE_EVENT_NAMES.BATCH_UPDATED]: (args: { affectedUrlIds: string }, id: string) => void
}


urlQueueEvents.on<CustomEventsListener>(BULLMQ_QUEUE_EVENT_NAMES.URL_UPDATED, async ({ jobId, status }: UrlUpdatedQueueEvent) => {
    console.log(`Job ${jobId} has updated`);
    const jobInfo = await UrlRepository.getUrl(jobId);
    if (jobInfo) {
        console.log("job status = ", jobInfo?.jobStatus);
        ActiveUrlJobsContext.jobUpdated(jobId, {
            ...jobInfo,
            jobStatus: status as any
        });
    }
})

urlQueueEvents.on<CustomEventsListener>(BULLMQ_QUEUE_EVENT_NAMES.BATCH_UPDATED, async ({ affectedUrlIds }: { affectedUrlIds: string }) => {
    console.log("Affected Url Ids")
    console.log(typeof affectedUrlIds);
    const parsed = JSON.parse(affectedUrlIds) as { data: string[] };
    ActiveUrlJobsContext.batchUpdated(parsed.data);
})



urlQueueEvents.on("failed", async (job) => {
    console.log(job.jobId);
})