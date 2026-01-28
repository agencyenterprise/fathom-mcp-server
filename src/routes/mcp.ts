import { Router } from "express";
import { bearerAuthMiddleware } from "../middleware/auth";
import { asyncHandler } from "../middleware/error";
import { McpController } from "../modules/mcp";

const router = Router();

router.post("/", asyncHandler(McpController.handlePost));
router.get("/", bearerAuthMiddleware, asyncHandler(McpController.handleGet));
router.delete(
  "/",
  bearerAuthMiddleware,
  asyncHandler(McpController.handleDelete),
);

export const mcpRouter = router;
