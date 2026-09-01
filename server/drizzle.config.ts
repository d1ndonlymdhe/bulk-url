import * as dotenv from "dotenv";

dotenv.config();
export default {
  schema: "./src/apps/**/schema/**/*.schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};
