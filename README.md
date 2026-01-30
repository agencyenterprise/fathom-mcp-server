# Fathom MCP

Connect Claude to your Fathom meetings, transcripts, and AI summaries.

## Use Now

Add this URL as a custom connector in Claude Desktop:

```
https://fathom-mcp-production.up.railway.app/mcp
```

**Steps**:

1. Open Claude Desktop
2. Go to Settings > Connectors > Add Custom Connector
3. Paste the URL above
4. Authenticate with your Fathom account

**For organizations**: Admins must add the connector in the organization's admin settings, not personal settings.

## Available Tools

| Tool                | Description                                             |
| ------------------- | ------------------------------------------------------- |
| `list_meetings`     | List meetings with filters (date, team, recorder, etc.) |
| `search_meetings`   | Search meetings by title with optional filters          |
| `get_transcript`    | Get full transcript for a recording                     |
| `get_summary`       | Get AI-generated summary for a recording                |
| `list_teams`        | List all accessible teams                               |
| `list_team_members` | List members of a team                                  |

<!-- TODO: Add link to zod-openapi generated documentation -->

### Example Usage in Claude

> "Show me my meetings from last week"

> "Get the transcript from my standup yesterday"

> "Summarize my meeting with the design team"

## Permissions

This MCP server defines a custom scope called `fathom:read` for tokens it issues to Claude. This is not a Fathom API scope - it's specific to this MCP server to describe read-only access to your Fathom data.

The Fathom API itself only provides read access via its `public_api` scope. Write operations (creating/editing meetings, transcripts, etc.) are not available in the Fathom API.

## Limitations

- `search_meetings` performs client-side filtering since Fathom's API doesn't provide a search endpoint. For users with many meetings, use `list_meetings` with date filters instead.

## Self-Hosting

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ installed, OR Docker (recommended)
- Fathom OAuth app credentials

### 1. Get Fathom OAuth Credentials

1. Go to [Fathom Developer Portal](https://developers.fathom.ai/oauth)
2. Click "Register your app" (requires Fathom admin access)
3. Note your Client ID and Client Secret

### 2. Database Setup

#### Option A: Using Docker (Recommended)

```bash
# Coming soon - see open-source-todos.md
```

#### Option B: Local PostgreSQL

1. Install PostgreSQL from https://www.postgresql.org/download/
2. Create the database (run in terminal):
   ```bash
   createdb fathom_mcp
   ```
3. Copy `.env.example` to `.env` and set your connection string:
   ```
   DATABASE_URL=postgresql://localhost:5432/fathom_mcp
   ```
4. Run migrations:
   ```bash
   npm run db:migrate
   ```

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

### 4. Install & Run

```bash
npm install
npm run dev
```

## Development

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm run start        # Run production build
npm run lint         # Check for linting errors
npm run lint:fix     # Fix linting errors
npm run format       # Format code with Prettier
npm run db:studio    # Open Drizzle Studio for database inspection
npm run db:generate  # Generate migrations from schema changes
npm run db:migrate   # Run pending migrations
npm run db:push      # Push schema directly (dev only)
```

## Beta Testing

For pre-release features, use the staging URL:

```
https://fathom-mcp-staging.up.railway.app/mcp
```

<!-- TODO: Document what's in beta vs production -->

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.
