import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const batchSchema = pgTable("batch", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updatedAt", { withTimezone: true })
        .$onUpdate(() => new Date())
        .defaultNow()
        .notNull(),
})