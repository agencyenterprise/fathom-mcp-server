import type { Request, Response } from "express";
import { ErrorLogger } from "../../shared/errors";

const BLOCKED_SCHEMES = ["javascript:", "data:", "vbscript:"];

export function renderOAuthSuccessPage(req: Request, res: Response) {
  const redirect = validateRedirect(req.query.redirect as string);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
  );
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(buildSuccessHtml(redirect));
}

function validateRedirect(redirect: string | undefined): string {
  if (!redirect) {
    throw ErrorLogger.validation("Missing redirect parameter");
  }

  let url: URL;
  try {
    url = new URL(redirect);
  } catch {
    throw ErrorLogger.validation("Invalid redirect URL");
  }

  if (BLOCKED_SCHEMES.includes(url.protocol)) {
    throw ErrorLogger.validation("Invalid redirect scheme");
  }

  return redirect;
}

function buildSuccessHtml(redirect: string): string {
  const safeRedirect = redirect.replace(/"/g, "&quot;");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Connected - Fathom MCP</title>
  <link rel="icon" type="image/png" href="/logo.png" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #fff;
    }
    main { text-align: center; }
    .checkmark { width: 64px; height: 64px; margin: 0 auto 24px; border-radius: 50%; background: #22c55e; display: flex; align-items: center; justify-content: center; }
    .checkmark svg { width: 32px; height: 32px; }
    h1 { font-size: 24px; font-weight: 500; margin-bottom: 8px; }
    p { color: #888; font-size: 14px; }
  </style>
</head>
<body>
  <main>
    <div class="checkmark">
      <svg fill="none" stroke="#fff" stroke-width="3" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <p>Fathom Authentication Successful!</p>
    <h1>Follow the 'Open Link' back to Claude.</h1>
    <p>After that, you can close this window at any time.</p>
  </main>
  <script>setTimeout(function() { window.location.href = "${safeRedirect}"; }, 50);</script>
</body>
</html>`;
}
