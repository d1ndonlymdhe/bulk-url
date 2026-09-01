import type { DbOrTx } from "../../../dbOrTx";
import db from "../../../drizzle";
import { batchSchema } from "../schema/batch.schema";
import { urlSchema } from "../schema/url.schema";
import { urlBatchSchema } from "../schema/urlBatch.schema";


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
        const batches = await runner.query.batchSchema.findMany();
        return batches;
    }

    public static async getAllBatchesWithUrls(runner: DbOrTx = db) {
        const batches = await runner.query.batchSchema.findMany({
            with: {
                urls: true
            }
        });
        return batches;
    }

    public static async getBatchWithUrls(batchId: string, runner: DbOrTx = db) {
        const batch = await runner.query.batchSchema.findFirst({
            with: {
                urls: true
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

    public static async getBatchById(batchId: string, runner: DbOrTx = db) {
        const batch = await runner.query.batchSchema.findFirst({
            where: {
                id: batchId
            }
        })
        return batch;
    }
}