import { Router } from "express";
import { asyncHandler } from "../middleware/error";
import { McpController } from "../modules/mcp";

const router = Router();

router.post("/", asyncHandler(McpController.handlePost));
router.get("/", asyncHandler(McpController.handleGet));
router.delete("/", asyncHandler(McpController.handleDelete));

export const mcpRouter = router;
