import { Router } from "express";
import {
  retrieveAuthenticatedSession,
  routeToSessionOrInitialize,
  terminateAuthenticatedSession,
} from "../modules/sessions/controller";

const router = Router();

router.post("/", (req, res, next) =>
  routeToSessionOrInitialize(req, res).catch(next),
);
router.get("/", (req, res, next) =>
  retrieveAuthenticatedSession(req, res).catch(next),
);
router.delete("/", (req, res, next) =>
  terminateAuthenticatedSession(req, res).catch(next),
);

export default router;
