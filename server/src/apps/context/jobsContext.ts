import { connection } from "../../../shared/redisConnection";
import type { Url } from "../urlImport/schema/url.schema";
import { UserContext } from "./userContext";
import { Redis } from "ioredis";
export class ActiveUrlJobsContext {
    static userContexts: UserContext[] = [];
    private static redisConnection = new Redis({
        ...connection
    });
    static jobCompleted(jobId: string, result: Url) {

        // Notify all user contexts that the job is complete
        this.userContexts.forEach(userContext => {
            userContext.jobCompleted(jobId, result);
        })
    }

    static jobStarted(jobId: string, result: Url) {
        this.userContexts.forEach(UserContext => {
            UserContext.jobStarted(jobId, result);
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