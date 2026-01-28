import { healthRouter } from "./health";
import { oauthRouter } from "./oauth";

export const routes = {
  health: healthRouter,
  oauth: oauthRouter,
};
