import express from "express";
import { config } from "./common/config";
import { bearerAuthMiddleware } from "./middleware/auth";
import { routes } from "./routes";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/health", routes.health);
app.use("/.well-known", routes.wellKnown);
app.use("/oauth", routes.oauth);
app.use("/mcp", bearerAuthMiddleware, routes.mcp);

app.get("/", (_req, res) => {
  res.json({
    name: "fathom-mcp",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      wellKnown: "/.well-known/oauth-protected-resource",
      oauth: "/oauth/authorize",
      mcp: "/mcp",
    },
  });
});

app.listen(config.port, () => {
  console.log(`Fathom MCP server running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`MCP endpoint: ${config.baseUrl}/mcp`);
});
