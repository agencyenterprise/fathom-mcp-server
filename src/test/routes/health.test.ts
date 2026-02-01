import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({
  db: {
    execute: vi.fn(),
  },
}));

import { db } from "../../db";

import express from "express";
import request from "supertest";
import healthRouter from "../../routes/health";

function createTestApp() {
  const app = express();
  app.use("/health", healthRouter);
  return app;
}

describe("routes/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /health", () => {
    it("returns 200 when all checks pass", async () => {
      vi.mocked(db.execute).mockResolvedValue([] as never);

      const app = createTestApp();
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
      expect(response.body.checks.database).toBe("ok");
      expect(response.body.checks.configuration).toBe("ok");
    });

    it("returns service metadata", async () => {
      vi.mocked(db.execute).mockResolvedValue([] as never);

      const app = createTestApp();
      const response = await request(app).get("/health");

      expect(response.body.service).toBe("fathom-mcp");
      expect(response.body.version).toBeDefined();
      expect(response.body.environment).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it("returns 503 when database check fails", async () => {
      vi.mocked(db.execute).mockRejectedValue(new Error("Connection refused"));

      const app = createTestApp();
      const response = await request(app).get("/health");

      expect(response.status).toBe(503);
      expect(response.body.status).toBe("degraded");
      expect(response.body.checks.database).toBe("error");
    });

    it("includes timestamp in ISO format", async () => {
      vi.mocked(db.execute).mockResolvedValue([] as never);

      const app = createTestApp();
      const response = await request(app).get("/health");

      expect(response.body.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
    });
  });
});
