import { batchQueue } from "../../../queue";
import { ActiveUrlJobsContext } from "../../context/jobsContext";
import { UrlRepository } from "@myapp/db";

export class UrlService {

    public static async getAllBatches() {
        const batches = await UrlRepository.getAllBatches();
        return batches;
    }

    public static async getBatch(batchId: string) {
        const batch = await UrlRepository.getBatchById(batchId);
        return batch;
    }

    public static async getUrlsByBatchId(batchId: string) {
        const batchWithUrls = await UrlRepository.getBatchWithUrls(batchId);
        if (!batchWithUrls) {
            throw new Error(`Batch with id ${batchId} not found`);
        }
        return batchWithUrls.urls;
    }

    public static async getUrlById(urlId: string) {
        const url = await UrlRepository.getUrl(urlId);
        if (!url) {
            throw new Error(`URL with id ${urlId} not found`);
        }
        return url;
    }

    public static async importUrlsFromFile(batchName: string, file: File) {
        const text = await file.text();
    }

    public static async importUrls(batchName: string, urls: string[]) {
        const result = await UrlRepository.createBatch(batchName, urls);
        if (result.batch) {
            await batchQueue.add('batch-job', {
                batchId: result.batch.id,
                forceRetry: false
            });
        }
        return result;
    }

    public static async retryFailedUrls(batchId: string) {
        const batch = await UrlRepository.getBatchById(batchId);
        if (!batch) {
            throw new Error(`Batch with id ${batchId} not found`);
        }
        await batchQueue.add('batch-job', {
            batchId: batch.id,
            forceRetry: true
        })
    }

    public static async cancelBatch(batchId: string) {
        const batch = await UrlRepository.getBatchById(batchId);
        if (!batch) {
            throw new Error(`Batch with id ${batchId} not found`);
        }
        ActiveUrlJobsContext.cancelBatch(batch.id);
    }

    public static async reprocessIncompleteBatches(){
        const incompleteBatches = await UrlRepository.getBatchesToProcess();
        for (const batch of incompleteBatches) {
            await batchQueue.add('batch-job', {
                batchId: batch.id,
                forceRetry: false
            })
        }
    }

}