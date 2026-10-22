import { Router } from "express";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { config } from "../shared/config";

export default function landingRouter(publicPath: string) {
  const router = Router();
  const landingPagePath = path.join(publicPath, "index.html");

  if (existsSync(landingPagePath)) {
    const landingPage = readFileSync(landingPagePath, "utf-8").replaceAll(
      "https://www.fathom-mcp-server.com/mcp",
      `${config.baseUrl}/mcp`,
    );
    router.get(["/", "/index.html"], (_req, res) => {
      res.type("html").send(landingPage);
    });
  }

  return router;
}
