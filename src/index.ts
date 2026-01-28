import express from "express";
import { config } from "./common/config";
import { ClaudeService } from "./modules/claude";
import { routes } from "./routes";

const app = express();
const claudeService = new ClaudeService();

app.use(express.json());

app.use("/health", routes.health);
app.use("/oauth", routes.oauth);
app.use("/mcp", claudeService.getRouter());

app.get("/", (_req, res) => {
  res.json({
    name: "fathom-mcp",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      oauth: "/oauth/fathom/authorize",
      mcp: "/mcp",
    },
  });
});

const server = app.listen(config.port, () => {
  console.log(`Fathom MCP server running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`MCP endpoint: ${config.baseUrl}/mcp`);
});

process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await claudeService.close();
  server.close();
  process.exit(0);
});
