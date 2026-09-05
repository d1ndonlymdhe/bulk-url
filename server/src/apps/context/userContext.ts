import type { SSEReplyInterface } from "@fastify/sse";
import {
    SSE_EVENT_NAMES,
    type JobUpdatedSsePayload,
    type MultipleJobsUpdatedSsePayload,
    type UrlRow,
} from "@myapp/shared/config";

export class UserContext {

    id: string;
    activeUrls = new Set<string>();
    stream: SSEReplyInterface;

    constructor(urls: string[], stream: SSEReplyInterface) {
        this.activeUrls = new Set(urls);
        this.stream = stream;
        this.id = crypto.randomUUID();
    }
    getId() {
        return this.id;
    }
    addActiveUrl(urlId: string) {
        this.activeUrls.add(urlId);
    }
    jobUpdated(urlId: string, result: UrlRow) {
        const has = this.activeUrls.has(urlId);
        
        if (has) {
            console.log(`UserContext ${this.id} has urlId ${urlId} in activeUrls`);
            const payload: JobUpdatedSsePayload = { result };
            this.stream.send({
                event: SSE_EVENT_NAMES.JOB_UPDATED,
                data: payload,
            });
        }else{
            console.log(`UserContext ${this.id} does not have urlId ${urlId} in activeUrls`);
        }
    }
    multipleJobsUpdated(urls: UrlRow[]) {
        const relevantUrls = urls.filter(url => this.activeUrls.has(url.id));
        if (relevantUrls.length > 0) {
            const payload: MultipleJobsUpdatedSsePayload = { result: relevantUrls };
            this.stream.send({
                event: SSE_EVENT_NAMES.MULTIPLE_JOBS_UPDATED,
                data: payload,
            });
        }
    }
}