import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.string().default("3000"),
  DATABASE_URL: z.string(),
  BASE_URL: z.string(),
  FATHOM_CLIENT_ID: z.string(),
  FATHOM_CLIENT_SECRET: z.string(),
});

type EnvSchemaType = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten());
  process.exit(1);
}

const env = parsed.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
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
