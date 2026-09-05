import type db from "./drizzle";

type DbType = typeof db;
type TxType = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type DbOrTx = DbType | TxType;
