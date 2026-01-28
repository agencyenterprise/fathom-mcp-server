import { healthRouter } from "./health";
import { mcpRouter } from "./mcp";
import { oauthRouter } from "./oauth";
import { wellKnownRouter } from "./well-known";

export const routes = {
  health: healthRouter,
  mcp: mcpRouter,
  oauth: oauthRouter,
  wellKnown: wellKnownRouter,
};
