import type { SSEReplyInterface } from "@fastify/sse";
import type { Url } from "../urlImport/schema/url.schema";

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
    jobCompleted(urlId: string, result: Url) {
        const has = this.activeUrls.has(urlId);
        if (has) {
            // Send the result to the client via SSE
            this.stream.send({
                event: 'url-complete',
                data: {
                    result
                }
            });
        }
    }
    jobStarted(jobId: string, result: Url) {
        if (this.activeUrls.has(jobId)) {
            // Using the same event here too, the frontend just updates the data no need for separate event
            this.stream.send({
                event: 'url-complete',
                data: {
                    result
                }
            });
        }
    }
}