export const URL_QUEUE_NAME = 'url-queue';
export const BATCH_QUEUE_NAME = 'batch-queue';
export const MAX_URL_RETRIES = 3;
export type BatchJobData = {
    batchId: string;
    forceRetry: boolean; // Optional flag to indicate if this is a retry operation
};

export type UrlJobData = {
    url: string;
};
