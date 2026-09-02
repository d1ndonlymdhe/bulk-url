import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";


export const urlJobStatusValues = ["queued", "processing", "complete", "failed"] as const;
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

    updatedAt: timestamp("updatedAt", { withTimezone: true })
        .$onUpdate(() => new Date())
        .defaultNow()
        .notNull(),
})

export type Url = typeof urlSchema.$inferSelect;