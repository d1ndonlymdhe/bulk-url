import { serverFetch } from "@/server_fetch";

// Mirrors server/src/apps/urlImport/schema/*.schema.ts row shapes.
// Kept in sync manually since client and server are separate packages.
export type Batch = {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
};

export const urlJobStatusValues = ["queued", "re-queued", "processing", "complete", "failed", "cancelled"] as const;
export type UrlJobStatus = (typeof urlJobStatusValues)[number];
export const MAX_URL_RETRIES = 3;
export type Url = {
    id: string;
    url: string;
    jobStatus: UrlJobStatus;
    title: string | null;
    attempts: number;
    responseTime: number | null;
    responseStatus: number | null;
    createdAt: string;
    updatedAt: string;
};

export type BatchWithUrls = Batch & { urls: Url[] };

export type ImportUrlsResult = {
    batch: Batch;
    urls: Url[];
};

export namespace BatchesApi {
    // GET /batches
    export function getBatches() {
        return serverFetch<Batch[]>("/batches");
    }

    // GET /batches/:batchId
    export function getBatch(batchId: string) {
        return serverFetch<Batch>(`/batches/${encodeURIComponent(batchId)}`);
    }

    // GET /batches/:batchId/urls
    export async function getBatchUrls(batchId: string) {
        return serverFetch<Url[]>(`/batches/${encodeURIComponent(batchId)}/urls`);
    }

    // POST /batch
    export function createBatch(batchName: string, urls: string[]) {
        return serverFetch<ImportUrlsResult>("/batch", {
            method: "POST",
            body: JSON.stringify({ batchName, urls }),
        });
    }

    // POST /batch/:batchId/retry
    export function retryFailedUrls(batchId: string) {
        return serverFetch<void>(`/batch/${encodeURIComponent(batchId)}/retry`, {
            method: "POST",
            body: JSON.stringify({}),
        });
    }

    // POST /batch/:batchId/cancel
    export function cancelBatch(batchId: string) {
        return serverFetch<void>(`/batch/${encodeURIComponent(batchId)}/cancel`, {
            method: "POST",
            body: JSON.stringify({}),
        });
    }
}
