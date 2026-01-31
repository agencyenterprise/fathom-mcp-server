import { Router } from "express";
import { asyncHandler } from "../middleware/error";
import {
  retrieveAuthenticatedSession,
  routeToSessionOrInitialize,
  terminateAuthenticatedSession,
} from "../modules/sessions/controller";

const router = Router();

router.post("/", asyncHandler(routeToSessionOrInitialize));
router.get("/", asyncHandler(retrieveAuthenticatedSession));
router.delete("/", asyncHandler(terminateAuthenticatedSession));

export default router;
