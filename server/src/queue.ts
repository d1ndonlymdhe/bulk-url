import { Queue } from "bullmq";
import { connection } from "../shared/redisConnection";
import type { BatchJobData } from "../shared/config";

export const batchQueue = new Queue<BatchJobData>('batch-queue', { connection })