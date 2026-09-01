import type db from "./drizzle";

type db = typeof db;
type tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type DbOrTx = db | tx;
