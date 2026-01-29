# Fathom MCP

An MCP (Model Context Protocol) server that connects Claude to your Fathom meetings, transcripts, and AI summaries.

## What It Does

Once connected, Claude can:

- **List your meetings** with optional date filters
- **Search meetings** by title
- **Read full transcripts** from any recording
- **Get AI summaries** of your meetings
- **Access team information** and member lists

## Quick Start

### 1. Deploy the Server

<!-- TODO: Add one-click deploy buttons for Railway, Render, etc. -->

Deploy to your preferred hosting platform. You'll need:

- Node.js 18+
- PostgreSQL database

### 2. Configure Environment

```bash
# Server
NODE_ENV=production
PORT=3000
BASE_URL=https://your-deployed-server.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/fathom_mcp

# Fathom OAuth (from your Fathom app settings)
FATHOM_CLIENT_ID=your_client_id
FATHOM_CLIENT_SECRET=your_client_secret

# Claude callback
CLAUDE_AUTH_CALLBACK_URL=https://claude.ai/oauth/callback
```

### 3. Set Up Fathom OAuth

1. Log into [Fathom](https://fathom.video)
2. Go to **Settings → Integrations → OAuth Applications**
3. Create a new application
4. Set redirect URI to: `{YOUR_BASE_URL}/oauth/fathom/callback`
5. Copy the client ID and secret to your environment

### 4. Initialize the Database

```bash
npm run db:push
```

### 5. Connect from Claude

<!-- TODO: Add instructions for connecting MCP server to Claude Desktop or Claude.ai -->

Add the server URL to your Claude MCP configuration:

```
https://your-deployed-server.com/mcp
```

## Available Tools

| Tool                | Description                              |
| ------------------- | ---------------------------------------- |
| `list_meetings`     | List recent meetings with date filters   |
| `search_meetings`   | Search meetings by title                 |
| `get_transcript`    | Get full transcript for a recording      |
| `get_summary`       | Get AI-generated summary for a recording |
| `list_teams`        | List all accessible teams                |
| `list_team_members` | List members of a specific team          |

### Example Usage in Claude

> "Show me my meetings from last week"

> "Get the transcript from my standup yesterday"

> "Summarize my meeting with the design team"

## API Endpoints

| Endpoint                                      | Description                 |
| --------------------------------------------- | --------------------------- |
| `GET /health`                                 | Server health status        |
| `GET /.well-known/oauth-authorization-server` | OAuth server metadata       |
| `GET /.well-known/oauth-protected-resource`   | OAuth resource metadata     |
| `POST /oauth/register`                        | Dynamic client registration |
| `GET /oauth/authorize`                        | Start OAuth flow            |
| `POST /oauth/token`                           | Token exchange              |
| `POST /mcp`                                   | MCP message endpoint        |
| `GET /mcp`                                    | MCP SSE stream              |
| `DELETE /mcp`                                 | Terminate MCP session       |

## Limitations

- `search_meetings` performs client-side filtering since Fathom's API doesn't provide a search endpoint. For users with many meetings, use `list_meetings` with date filters instead.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.
