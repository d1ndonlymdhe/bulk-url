import { connection } from "../../../shared/redisConnection";
import { UrlRepository } from "../urlImport/repo/url.repo";
import type { UrlRow } from "@myapp/shared/config";
import { UserContext } from "./userContext";
import { Redis } from "ioredis";
export class ActiveUrlJobsContext {
    static userContexts: UserContext[] = [];
    private static redisConnection = new Redis({
        ...connection
    });
    static jobUpdated(jobId: string, result: UrlRow) {
        // Notify all user contexts that the job is complete
        this.userContexts.forEach(userContext => {
            userContext.jobUpdated(jobId, result);
        })
    }

    static batchUpdated(urlIds: string[]) {
        UrlRepository.getUrlsMultiple(urlIds).then(urls => {
            this.userContexts.forEach(userContext => {
                userContext.multipleJobsUpdated(urls);
            })
        })
    }

    static addUserContext(userContext: UserContext) {
        this.userContexts.push(userContext);
    }

    static removeUserContext(userContextId: string) {
        this.userContexts = this.userContexts.filter(uc => uc.id !== userContextId);
    }

    static cancelBatch(batchId: string) {
        // Publish a message to the Redis channel to notify all workers to cancel jobs for this batch
        this.redisConnection.publish('batch-cancel-event', batchId);
    }
}