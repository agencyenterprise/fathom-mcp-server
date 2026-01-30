import { Router } from "express";
import { asyncHandler } from "../middleware/error";
import {
  handleAuthorize,
  handleFathomCallback,
  handleRegister,
  handleTokenExchange,
} from "../modules/oauth/controller";

const router = Router();

router.post("/register", asyncHandler(handleRegister));
router.get("/authorize", asyncHandler(handleAuthorize));
router.get("/fathom/callback", asyncHandler(handleFathomCallback));
router.post("/token", asyncHandler(handleTokenExchange));

export default router;
