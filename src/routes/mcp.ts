import { Router } from "express";
import { McpController } from "../modules/mcp";

const router = Router();

router.post("/", McpController.handlePost);
router.get("/", McpController.handleGet);
router.delete("/", McpController.handleDelete);

export const mcpRouter = router;
