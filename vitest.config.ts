import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/test/**",
        "src/db/schema.ts",
        "src/db/index.ts",
        "src/docs/**",
        "src/index.ts",
        "src/routes/index.ts",
        "src/routes/docs.ts",
        "src/routes/mcp.ts",
        "src/routes/oauth.ts",
        "src/routes/well-known.ts",
        "src/middleware/logger.ts",
        "src/middleware/rateLimit.ts",
        "src/modules/oauth/success-page.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
    setupFiles: ["./src/test/setup.ts"],
  },
});
