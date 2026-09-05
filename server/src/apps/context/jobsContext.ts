import type { Url } from "../urlImport/schema/url.schema";
import { UserContext } from "./userContext";

export class ActiveUrlJobsContext {
    static userContexts: UserContext[] = [];

    static jobCompleted(jobId: string, result: Url) {
        
        // Notify all user contexts that the job is complete
        this.userContexts.forEach(userContext => {
            userContext.jobCompleted(jobId, result);
        })
    }

    static jobStarted(jobId:string, result: Url){
        this.userContexts.forEach(UserContext=>{
            UserContext.jobStarted(jobId,result);
        })
    }

    static addUserContext(userContext: UserContext) {
        this.userContexts.push(userContext);
    }

    static removeUserContext(userContextId: string) {
        this.userContexts = this.userContexts.filter(uc => uc.id !== userContextId);
    }
}