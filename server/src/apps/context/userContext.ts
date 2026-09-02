import type { SSEReplyInterface } from "@fastify/sse";

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
    completeUrl(urlId: string,result: any) {
        const removed = this.activeUrls.delete(urlId);
        // Send the result to the client via SSE
        if(removed){
            this.stream.send({
                event: 'url-complete',
                data: JSON.stringify({ urlId, result })
            });
        }
    }
}