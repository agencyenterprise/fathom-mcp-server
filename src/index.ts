import express from "express";
import { config } from "./common/config";
import { routes } from "./routes";

const app = express();

app.use(express.json());

app.use("/health", routes.health);

app.get("/", (_req, res) => {
  res.json({
    name: "fathom-mcp",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      mcp: "/mcp",
    },
  });
});

app.listen(config.port, () => {
  console.log(`Fathom MCP server running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Base URL: ${config.baseUrl}`);
});
