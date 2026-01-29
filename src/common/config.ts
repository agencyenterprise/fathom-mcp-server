import { readFileSync } from "fs";
import { join } from "path";
import { z } from "zod";

const pkgPath = join(process.cwd(), "package.json");
const pkg: { version: string } = JSON.parse(readFileSync(pkgPath, "utf-8"));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  BASE_URL: z.string().url(),
  FATHOM_CLIENT_ID: z.string().min(1),
  FATHOM_CLIENT_SECRET: z.string().min(1),
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
    fathom: {
      clientId: env.FATHOM_CLIENT_ID,
      clientSecret: env.FATHOM_CLIENT_SECRET,
      redirectUrl: `${env.BASE_URL}/oauth/fathom/callback`,
      authUrl: "https://fathom.video",
      apiUrl: "https://api.fathom.ai/external/v1",
    },
    claude: {
      callbackUrl: "https://claude.ai/api/mcp/auth_callback",
    },
  } as const;
}

export const config = loadConfig();
