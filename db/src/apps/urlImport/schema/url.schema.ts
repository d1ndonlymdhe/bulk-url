import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { URL_JOB_STATUS_VALUES } from "@myapp/shared/config";

export const urlJobStatusValues = URL_JOB_STATUS_VALUES;
export const urlJobStatusEnum = pgEnum("url_status", urlJobStatusValues);
export type UrlJobStatus = (typeof urlJobStatusValues)[number];
export const urlSchema = pgTable("url", {
    id: uuid("id").defaultRandom().primaryKey(),
    url: text("url").notNull(),

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
