import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";
import config from "../drizzle.config"
import { schema } from "./schema";
import { defineRelations } from "drizzle-orm/relations";

dotenv.config();

const pool = new Pool({
  connectionString: config.dbCredentials.url,
});

export const relations = defineRelations(schema, (r) => ({
  batchSchema: {
    urlBatchSchema: r.many.urlBatchSchema(),
    urls: r.many.urlSchema({
      from: r.batchSchema.id.through(r.urlBatchSchema.batchId),
      to: r.urlSchema.id.through(r.urlBatchSchema.urlId)
    })
  },
  urlSchema: {
    urlBatchSchema: r.many.urlBatchSchema(),
    batches: r.many.batchSchema({
      from: r.urlSchema.id.through(r.urlBatchSchema.urlId),
      to: r.batchSchema.id.through(r.urlBatchSchema.batchId)
    })
  },
  urlBatchSchema: {
    url: r.one.urlSchema({
      from: r.urlBatchSchema.urlId,
      to: r.urlSchema.id
    }),
    batch: r.one.batchSchema({
      from: r.urlBatchSchema.batchId,
      to: r.batchSchema.id
    })
  }
}))

if (pool) {
  console.log("Connected to the database");
} else {
  console.log("Failed to connect to the database");
}

export const db = drizzle({ client: pool, relations });

export const schemaPath = config.schema;
export default db;