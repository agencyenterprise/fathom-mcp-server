<div align="center">

# Fathom MCP Server

**Connect Claude to your Fathom meetings, transcripts, and AI summaries.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io)

[Get Started](#get-started) | [Available Tools](#available-tools) | [API Docs](https://www.fathom-mcp-server.com/docs) | [Self-Hosting](#self-hosting) | [Contributing](CONTRIBUTING.md)

🔒 [Your data is 100% secure](#security) 🔒

</div>

---

## Get Started

Connect in under 60 seconds:

```
https://www.fathom-mcp-server.com/mcp
```

1. Open **Claude Desktop**
2. Go to **Settings > Connectors > Add Custom Connector**
3. Paste the URL above
4. Authenticate with Fathom

That's it. Ask Claude about your meetings.

> **Organizations**: Admins must add the connector via organization admin settings, not personal settings.

## Available Tools

| Tool                | Description                                             | Docs                                                                                    |
| ------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `list_meetings`     | List meetings with filters (date, team, recorder, etc.) | [Fathom API](https://developers.fathom.ai/api-reference/meetings/list-meetings)         |
| `search_meetings`   | Search meetings by title with optional filters          | [MCP Custom](#custom-mcp-tools)                                                         |
| `get_transcript`    | Get full transcript for a recording                     | [Fathom API](https://developers.fathom.ai/api-reference/recordings/get-transcript)      |
| `get_summary`       | Get AI-generated summary for a recording                | [Fathom API](https://developers.fathom.ai/api-reference/recordings/get-summary)         |
| `list_teams`        | List all accessible teams                               | [Fathom API](https://developers.fathom.ai/sdks/available-methods)                       |
| `list_team_members` | List members of a team                                  | [Fathom API](https://developers.fathom.ai/api-reference/team-members/list-team-members) |

### Custom MCP Tools

Tools marked as **MCP Custom** are built specifically for this server and don't exist in the Fathom API. See the [/docs](https://www.fathom-mcp-server.com/docs) page for full parameter documentation.

#### `search_meetings`

Search meetings by title. This is an MCP-native tool that performs client-side filtering since Fathom's API doesn't provide a search endpoint.

| Parameter                        | Type     | Required | Description                                        |
| -------------------------------- | -------- | -------- | -------------------------------------------------- |
| `query`                          | string   | ✓        | Search term to match against meeting titles        |
| `limit`                          | number   |          | Max results to return (1-100)                      |
| `created_after`                  | string   |          | ISO datetime - only meetings created after this    |
| `created_before`                 | string   |          | ISO datetime - only meetings created before this   |
| `calendar_invitees_domains`      | string[] |          | Filter by attendee company domains                 |
| `calendar_invitees_domains_type` | enum     |          | `all` \| `only_internal` \| `one_or_more_external` |
| `teams`                          | string[] |          | Filter by team names                               |
| `recorded_by`                    | string[] |          | Filter by recorder email addresses                 |

### Example Usage in Claude

> "Show me my meetings from last week"

> "Get the transcript from my standup yesterday"

> "Summarize my meeting with the design team"

## Security

**Your Fathom data is never stored or exposed by this server.**

| Data                             | Stored? | Exposed? | Details                                                  |
| -------------------------------- | ------- | -------- | -------------------------------------------------------- |
| Meetings, transcripts, summaries | No      | No       | Fetched from Fathom and passed directly to Claude        |
| Team and member info             | No      | No       | Fetched from Fathom and passed directly to Claude        |
| OAuth tokens                     | Yes     | No       | Encrypted at rest (AES-256-GCM), never logged or exposed |

- **Pass-through architecture**: This server acts as a secure proxy, your Fathom data flows directly from Fathom to Claude without being stored, cached, or logged
- **Encryption at rest**: The only stored data (OAuth tokens) is encrypted using AES-256-GCM before being written to the database
- **HTTPS only**: All communication between Claude, this server, and Fathom is encrypted in transit

## Permissions

This MCP server defines a custom scope called `fathom:read` for tokens it issues to Claude. This is not a Fathom API scope - it's specific to this MCP server to describe read-only access to your Fathom data.

The Fathom API itself only provides read access via its `public_api` scope. Write operations (creating/editing meetings, transcripts, etc.) are not available in the Fathom API.

## Limitations

- `search_meetings` performs client-side filtering since Fathom's API doesn't provide a search endpoint. For users with many meetings, use `list_meetings` with date filters instead.

## Self-Hosting

Fathom OAuth apps require HTTPS redirect URIs, so local development with `http://localhost` isn't possible. Deploy to a hosting provider to test.

### 1. Deploy to a Hosting Provider

Railway (recommended), Render, or any platform that provides:

- Node.js 18+ runtime
- PostgreSQL database
- HTTPS URL

**Railway setup:**

1. Fork/clone this repo
2. Create a new Railway project (you can deploy directly from your forked Github repo)
3. Add a PostgreSQL database service in project
4. Connect Database url to deployed repo in project and setup other envs

### 2. Create a Fathom OAuth App

1. Go to [Fathom Developer Portal](https://developers.fathom.ai/oauth)
2. Click "Register your app" (requires Fathom admin access)
3. Set the redirect URI to `https://your-app-url.railway.app/oauth/fathom/callback`
4. Note your Client ID and Client Secret

### 3. Configure Environment Variables (locally and in Railway)

Set these in your hosting provider's dashboard (as well as your local .env file to test build and start commands locally before pushing changes)

| Variable               | Description                                                            |
| ---------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string (auto-set by Railway - use public db url) |
| `BASE_URL`             | Your app's public URL (e.g., `https://your-app.railway.app`)           |
| `TOKEN_ENCRYPTION_KEY` | 32-byte hex key (generate with `openssl rand -hex 32`)                 |
| `FATHOM_CLIENT_ID`     | From step 2                                                            |
| `FATHOM_CLIENT_SECRET` | From step 2                                                            |

### 4. Initialize Database

Run migrations after first deploy:

```bash
npm run db:push
```

Or via Railway CLI:

```bash
railway run npm run db:push
```

### 5. Connect Claude

Add your deployed URL as a custom connector in Claude Desktop:

```
https://your-app.railway.app/mcp
```

## Development

```bash
npm run dev          # Start dev server with hot reload only for testing
npm run build        # Build for production
npm run start        # Run production build
npm run lint         # Check for linting errors
npm run lint:fix     # Fix linting errors
npm run typecheck    # Run TypeScript type checking
npm run ci           # Run all CI checks (lint, typecheck, build)
npm run format       # Format code with Prettier
npm run db:studio    # Open Drizzle Studio for database inspection
npm run db:generate  # Generate migrations from schema changes
npm run db:migrate   # Run pending migrations
npm run db:push      # Push schema directly (dev only)
```

> **Tip**: Run `npm run ci` before pushing to ensure your changes pass GitHub Actions.

## Beta Testing

For pre-release features, use the staging URL:

```
https://fathom-mcp-staging.up.railway.app/mcp
```

## Fathom AI Deep dive

https://developers.fathom.ai/llms.txt

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.
