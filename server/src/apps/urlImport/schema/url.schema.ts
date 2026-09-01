import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const urlSchema = pgTable("url", {
    id: uuid("id").defaultRandom().primaryKey(),
    url: text("url").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updatedAt", { withTimezone: true })
        .$onUpdate(() => new Date())
        .defaultNow()
        .notNull(),
})