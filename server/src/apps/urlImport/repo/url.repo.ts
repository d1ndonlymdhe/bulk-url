import { MAX_URL_RETRIES } from "@myapp/shared/config";
import type { DbOrTx } from "../../../dbOrTx";
import db from "../../../drizzle";
import { batchSchema } from "../schema/batch.schema";
import { urlJobStatusEnum, urlSchema, type UrlJobStatus } from "../schema/url.schema";
import { urlBatchSchema } from "../schema/urlBatch.schema";
import { eq, sql, inArray, desc, asc } from "drizzle-orm";

export class UrlRepository {
    // The last runner argument allows for the service layer to pass in a transaction if it wants.
    public static async createBatch(batchName: string, urls: string[], runner: DbOrTx = db) {
        return await runner.transaction(async (tx) => {
            const batch = await tx.insert(batchSchema).values({ name: batchName }).returning();
            if (!batch || batch.length === 0) {
                throw new Error("Failed to create batch");
            }
            const urlsInserted = await tx.insert(urlSchema).values(urls.map((url) => ({ url }))).returning();
            const urlBatchValues = urlsInserted.map((url) => ({
                urlId: url.id,
                batchId: batch[0]!.id,
            }));
            await tx.insert(urlBatchSchema).values(urlBatchValues);
            return { batch: batch[0], urls: urlsInserted };
        })
    }

    public static async getAllBatches(runner: DbOrTx = db) {
        const batches = await runner.query.batchSchema.findMany({
            orderBy: (batch, { desc }) => [desc(batch.createdAt)],
        });
        return batches;
    }

    public static async getAllBatchesWithUrls(runner: DbOrTx = db) {
        const batches = await runner.query.batchSchema.findMany({
            with: {
                urls: {
                    orderBy: (url, { desc }) => [desc(url.createdAt)],
                }
            },
            orderBy: (batch, { desc }) => [desc(batch.createdAt)],
        });
        return batches;
    }

    public static async getBatchWithUrls(batchId: string, runner: DbOrTx = db) {
        const batch = await runner.query.batchSchema.findFirst({
            with: {
                urls: {
                    orderBy: (url, { desc }) => [desc(url.createdAt)],
                }
            },
            where: {
                id: batchId
            }
        })
        return batch;
    }

    public static async getUrl(urlId: string, runner: DbOrTx = db) {
        const url = await runner.query.urlSchema.findFirst({
            where: {
                id: urlId
            }
        })
        return url;
    }

    public static async getUrlsMultiple(urlIds: string[], runner: DbOrTx = db) {
        const urls = await runner.query.urlSchema.findMany({
            where: {
                RAW: (url) => inArray(url.id, urlIds)
            }
        })
        return urls;
    }

    public static async getBatchById(batchId: string, runner: DbOrTx = db) {
        const batch = await runner.query.batchSchema.findFirst({
            where: {
                id: batchId
            }
        })
        return batch;
    }

    public static async getUrlsToProcessFromBatch(batchId: string, runner: DbOrTx = db) {
        const batch = await runner.query.batchSchema.findFirst({
            with: {
                urls: {
                    where: {
                        OR: [
                            {
                                jobStatus: "queued"
                            },
                            {
                                jobStatus: "re-queued"
                            },
                        ]
                    },
                    orderBy: (url, { desc }) => [desc(url.createdAt)],
                }
            },
            where: {
                id: batchId
            }
        },
        )

        return batch;
    }

    public static async getBatchesToProcess(runner: DbOrTx = db) {
        const batches = await runner.query.batchSchema.findMany({
            with: {
                urls: {
                    where: {
                        OR: [
                            {
                                jobStatus: "queued"
                            },
                            {
                                jobStatus: "re-queued"
                            },
                        ]
                    },
                    orderBy: (url, { desc }) => [desc(url.createdAt)],
                }
            },
            orderBy: (batch, { desc }) => [desc(batch.createdAt)],
        })
        return batches;
    }

    public static async getFailedUrlsFromBatch(batchId: string, runner: DbOrTx = db) {
        const batch = await runner.query.batchSchema.findFirst({
            with: {
                urls: {
                    where: {
                        jobStatus: "failed"
                    },
                    orderBy: (url, { desc }) => [desc(url.createdAt)],
                }
            },
            where: {
                id: batchId
            }
        },
        )

        return batch;
    }

    public static async requeueUrls(urlIds: string[], runner: DbOrTx = db) {
        const updatedUrls = await runner.update(urlSchema).set({
            jobStatus: "queued",
            attempts: 0,
        }).where(inArray(urlSchema.id, urlIds)).returning();
        return updatedUrls;
    }

    public static async markAsStarted(urlId: string, runner: DbOrTx = db) {
        const updatedUrl = await runner.update(urlSchema).set({
            jobStatus: "processing",
            attempts: sql`${urlSchema.attempts}+1`
        }).where(eq(urlSchema.id, urlId)).returning();
        return updatedUrl[0];
    }

    public static async markAsComplete(urlId: string, title: string | null, responseTime: number | null, responseStatus: number | null, runner: DbOrTx = db) {
        const updatedUrl = await runner.update(urlSchema).set({
            jobStatus: "complete",
            title,
            responseTime,
            responseStatus
        }).where(eq(urlSchema.id, urlId)).returning();
        return updatedUrl[0];
    }

    public static async markAsFailed(urlId: string, runner: DbOrTx = db) {
        // If the task has failed less than MAX_RETRIES_TIMES mark as queued again and increment the attempts counter, after max attempts the user retries manually
        try {
            const updatedUrl = await runner.update(urlSchema).set({
                jobStatus: sql`CASE
                WHEN ${urlSchema.attempts} < ${MAX_URL_RETRIES} THEN 're-queued'::${urlJobStatusEnum}
                else 'failed'::${urlJobStatusEnum}
                END`
            }).where(eq(urlSchema.id, urlId)).returning();
            return updatedUrl[0];
        } catch (err) {
            console.error(`Error marking URL ${urlId} as failed:`, err);
        }
    }

    public static async markAsCancelled(urlId: string, runner: DbOrTx = db) {
        const updatedUrl = await runner.update(urlSchema).set({
            jobStatus: "cancelled",
        }).where(eq(urlSchema.id, urlId)).returning();
        return updatedUrl[0];
    }

    public static async isJobCancelled(urlId: string, runner: DbOrTx = db) {
        const url = await runner.query.urlSchema.findFirst({
            where: {
                id: urlId
            }
        })
        if(!url) {
            throw new Error(`URL with id ${urlId} not found`);
        }
        return url.jobStatus === "cancelled";
    }

    public static async markBatchAsCancelled(batchId: string, runner: DbOrTx = db) {
        const urlIds = await runner.transaction(async (tx) => {
            const batch = await runner.query.batchSchema.findFirst({
                with: {
                    urls: {
                        where: {
                            OR: [
                                {
                                    jobStatus: "processing"
                                },
                                {
                                    jobStatus: "queued"
                                },
                                {
                                    jobStatus: "re-queued"
                                }
                            ]
                        },
                        orderBy: (url, { desc }) => [desc(url.createdAt)],
                    }
                },
                orderBy: (batch, { desc }) => [desc(batch.createdAt)],
                where: {
                    id: batchId
                }
            })
            if (batch) {
                console.log("Processing urls = ", batch.urls.map((url) => url.id));

                const urlIds = batch.urls.map((url) => url.id);
                await tx.update(urlSchema).set({
                    jobStatus: "cancelled",
                }).where(inArray(urlSchema.id, urlIds));
                return urlIds;
            } else {
                return []
            }
        })
        return urlIds;
    }
}