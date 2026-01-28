import { drizzle } from "drizzle-orm/node-postgres";
import { config } from "../common/config";
import * as schema from "./schema";

export const db = drizzle(config.databaseUrl, { schema });

export * from "./schema";
