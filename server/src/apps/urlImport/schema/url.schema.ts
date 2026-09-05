import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";


export const urlJobStatusValues = [
    // Initial 
    "queued",
    // Retry after failure (upto max attempts)
    "re-queued",
    // Pinging the URL
    "processing",
    // Success
    "complete",
    // Failed max attempts time, user has to manually retry and set as queued
    "failed",
    // User manually cancelled the job
    "cancelled"
] as const;
export const urlJobStatusEnum = pgEnum("url_status", urlJobStatusValues);
export type UrlJobStatus = (typeof urlJobStatusValues)[number];
export const urlSchema = pgTable("url", {
    id: uuid("id").defaultRandom().primaryKey(),
    url: text("url").notNull(),

    // URL job status
    jobStatus: urlJobStatusEnum("job_status").default("queued").notNull(),

    title: text("title"),
    responseTime: integer("response_time"),
    responseStatus: integer("responseStatus"),
    createdAt: timestamp("createdAt", { withTimezone: true })
        .defaultNow()
        .notNull(),
    attempts: integer().default(0),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
        .$onUpdate(() => new Date())
        .defaultNow()
        .notNull(),
})

export type Url = typeof urlSchema.$inferSelect;