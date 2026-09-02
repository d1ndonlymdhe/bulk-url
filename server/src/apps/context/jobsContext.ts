import type { UserContext } from "./userContext";

export class ActiveUrlJobsContext {
    // store the url Ids which we use as jobIds in the queue
    static urlIds = new Set<string>();
    static userContexts: UserContext[] = [];
    static addJobId(jobId: string) {
        this.urlIds.add(jobId);
    }
    static completeJob(jobId: string, result: any) {
        this.urlIds.delete(jobId);
        // Notify all user contexts that the job is complete
        this.userContexts.forEach(userContext => {
            userContext.completeUrl(jobId, result);
        })
    }
    static addUserContext(userContext: UserContext) {
        this.userContexts.push(userContext);
    }
    static removeUserContext(userContextId: string) {
        this.userContexts = this.userContexts.filter(uc => uc.id !== userContextId);
    }
}