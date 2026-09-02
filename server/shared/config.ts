export const URL_QUEUE_NAME = 'url-queue';
export const BATCH_QUEUE_NAME = 'batch-queue';

export type BatchJobData = {
    batchId: string;
};

export type UrlJobData = {
    url: string;
};
