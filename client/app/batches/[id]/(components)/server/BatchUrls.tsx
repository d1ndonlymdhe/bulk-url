import BatchUrlsClient from "@/app/batches/[id]/(components)/client/BatchUrlsClient";
import { BatchesApi } from "@/app/batches/api/batchesApi";


export async function BatchUrls({ batchId }: { batchId: string }) {
    const urls = await BatchesApi.getBatchUrls(batchId);
    return (
        <BatchUrlsClient urls={urls} batchId={batchId} />
    );
}
