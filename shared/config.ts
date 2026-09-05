export const URL_QUEUE_NAME = 'url-queue';
export const BATCH_QUEUE_NAME = 'batch-queue';
export const MAX_URL_RETRIES = 3;

export const URL_JOB_STATUS_VALUES = [
  'queued',
  're-queued',
  'processing',
  'complete',
  'failed',
  'cancelled',
] as const;

export type UrlJobStatus = (typeof URL_JOB_STATUS_VALUES)[number];

export type UrlRow = {
  id: string;
  url: string;
  jobStatus: UrlJobStatus;
  title: string | null;
  attempts: number | null;
  responseTime: number | null;
  responseStatus: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export const BULLMQ_QUEUE_EVENT_NAMES = {
  URL_UPDATED: 'url-updated',
  BATCH_UPDATED: 'batch-updated',
} as const;

export type BullMQQueueEventName =
  (typeof BULLMQ_QUEUE_EVENT_NAMES)[keyof typeof BULLMQ_QUEUE_EVENT_NAMES];

export type UrlUpdatedQueueEvent = {
  jobId: string;
  status: UrlJobStatus;
};

export type BatchUpdatedQueueEvent = {
  affectedUrlIds: string[];
};

export const SSE_EVENT_NAMES = {
  JOB_UPDATED: 'job-updated',
  MULTIPLE_JOBS_UPDATED: 'multiple-jobs-updated',
} as const;

export type SseEventName = (typeof SSE_EVENT_NAMES)[keyof typeof SSE_EVENT_NAMES];

export type JobUpdatedSsePayload = {
  result: UrlRow;
};

export type MultipleJobsUpdatedSsePayload = {
  result: UrlRow[];
};

export type BatchJobData = {
  batchId: string;
  forceRetry: boolean;
};

export type UrlJobData = {
  url: string;
};
