import { Router } from "express";
import { openapiDocument } from "../docs/openapi";

const router = Router();

router.get("/openapi.json", (_req, res) => {
  res.json(openapiDocument);
});

router.get("/", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation - Fathom AI MCP Server</title>
  <meta name="description" content="Complete API documentation for Fathom AI MCP Server. Explore OAuth endpoints, MCP tools, and integration guides for connecting Claude to Fathom AI meetings.">
  <meta name="keywords" content="fathom mcp api, mcp server documentation, claude integration api, fathom oauth, mcp tools api reference">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://www.fathom-mcp-server.com/docs">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="API Documentation - Fathom AI MCP Server">
  <meta property="og:description" content="Complete API documentation for Fathom AI MCP Server. OAuth endpoints, MCP tools, and integration guides.">
  <meta property="og:url" content="https://www.fathom-mcp-server.com/docs">
  <meta property="og:image" content="https://www.fathom-mcp-server.com/logo.png">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="API Documentation - Fathom AI MCP Server">
  <meta name="twitter:description" content="Complete API documentation for Fathom AI MCP Server. OAuth endpoints, MCP tools, and integration guides.">
  <meta name="twitter:image" content="https://www.fathom-mcp-server.com/logo.png">

  <link rel="icon" type="image/png" href="/logo.png">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/docs/openapi.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis],
      layout: 'BaseLayout',
      deepLinking: true,
    });
  </script>
</body>
</html>`);
});

export default router;
