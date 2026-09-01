import * as batchSchema from "./batch.schema";
import * as urlBatchSchema from "./urlBatch.schema";
import * as urlSchema from "./url.schema";

export const urlSchemas = { ...batchSchema, ...urlBatchSchema, ...urlSchema };