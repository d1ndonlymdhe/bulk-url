import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

export const urlBatchSchema = pgTable("url_batch", {
    id: uuid("id").defaultRandom().primaryKey(),
    batchId: uuid("batch_id").notNull(),
    urlId: uuid("url_id").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updatedAt", { withTimezone: true })
        .$onUpdate(() => new Date())
        .defaultNow()
        .notNull(),
})