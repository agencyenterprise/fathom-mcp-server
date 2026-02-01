import dotenv from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";
import { z } from "zod";

dotenv.config();

const pkgPath = join(process.cwd(), "package.json");
const pkg: { version: string } = JSON.parse(readFileSync(pkgPath, "utf-8"));

const envSchema = z.object({
  NODE_ENV: z.enum(["staging", "production"]).default("staging"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  BASE_URL: z.string().url(),
  FATHOM_CLIENT_ID: z.string().min(1),
  FATHOM_CLIENT_SECRET: z.string().min(1),
  CLAUDE_AUTH_CALLBACK_URL: z.string().url(),
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .length(
      64,
      "TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)",
    )
    .regex(/^[0-9a-fA-F]+$/, "TOKEN_ENCRYPTION_KEY must be a hex string"),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Invalid environment variables:", result.error.flatten());
    process.exit(1);
  }

  const env = result.data;

  return {
    version: pkg.version,
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    baseUrl: env.BASE_URL,
    encryptionKey: Buffer.from(env.TOKEN_ENCRYPTION_KEY, "hex"),
    fathom: {
      clientId: env.FATHOM_CLIENT_ID,
      clientSecret: env.FATHOM_CLIENT_SECRET,
      redirectUrl: `${env.BASE_URL}/oauth/fathom/callback`,
      oauthBaseUrl: "https://fathom.video",
      apiBaseUrl: "https://api.fathom.ai/external/v1",
    },
    claude: {
      callbackUrl: env.CLAUDE_AUTH_CALLBACK_URL,
    },
  } as const;
}

export const config = loadConfig();
