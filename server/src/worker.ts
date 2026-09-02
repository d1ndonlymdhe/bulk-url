import { Worker } from 'bullmq';
import { config } from 'dotenv';

config();

const connection = {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379')
};

const worker = new Worker('my-queue', async (job) => {
    console.log("Got job:", JSON.stringify(job, null, 2));
}, {
    connection,
    concurrency: 5
})

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});