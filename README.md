# Fathom MCP

An MCP (Model Context Protocol) server that connects Claude to the Fathom API, enabling AI-powered access to your meeting recordings, transcripts, and summaries.

## Features

- **OAuth 2.0 with PKCE** - Secure authentication flow between Claude, this server, and Fathom
- **MCP Protocol** - Full MCP implementation using HTTP streamable transport
- **Meeting Tools** - List meetings, search by title, get transcripts and AI summaries
- **Team Management** - Access team and member information
- **Session Management** - Persistent sessions with automatic cleanup
- **Rate Limiting** - Per-user rate limiting to prevent abuse

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Fathom account with API access
- Fathom OAuth application credentials

## Installation

```bash
git clone https://github.com/your-username/fathom-mcp.git
cd fathom-mcp
npm install
```

## Configuration

Copy the example environment file and configure your values:

```bash
cp .env.example .env
```

### Environment Variables

| Variable                   | Description                        |
| -------------------------- | ---------------------------------- |
| `NODE_ENV`                 | `development` or `production`      |
| `PORT`                     | Server port (default: 3000)        |
| `BASE_URL`                 | Public URL of your deployed server |
| `DATABASE_URL`             | PostgreSQL connection string       |
| `FATHOM_CLIENT_ID`         | OAuth client ID from Fathom        |
| `FATHOM_CLIENT_SECRET`     | OAuth client secret from Fathom    |
| `CLAUDE_AUTH_CALLBACK_URL` | Claude's OAuth callback URL        |

### Fathom OAuth Setup

1. Log into your Fathom account
2. Navigate to Settings → Integrations → OAuth Applications
3. Create a new OAuth application
4. Set the redirect URI to `{BASE_URL}/oauth/fathom/callback`
5. Copy the client ID and secret to your `.env` file

## Database Setup

This project uses Drizzle ORM with PostgreSQL.

```bash
# Push schema to database (development)
npm run db:push

# Or generate and run migrations (production)
npm run db:generate
npm run db:migrate
```

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## API Endpoints

### Health Check

- `GET /health` - Server and database health status

### OAuth Discovery

- `GET /.well-known/oauth-protected-resource` - OAuth resource metadata
- `GET /.well-known/oauth-authorization-server` - OAuth server metadata

### OAuth Flow

- `POST /oauth/register` - Dynamic client registration
- `GET /oauth/authorize` - Start authorization flow
- `GET /oauth/fathom/callback` - Fathom OAuth callback
- `POST /oauth/token` - Exchange code for access token

### MCP Protocol

- `POST /mcp` - Initialize session or send messages
- `GET /mcp` - Retrieve session messages (SSE)
- `DELETE /mcp` - Terminate session

## MCP Tools

| Tool                | Description                                      |
| ------------------- | ------------------------------------------------ |
| `list_meetings`     | List recent meetings with optional date filters  |
| `search_meetings`   | Search meetings by title (client-side filtering) |
| `get_transcript`    | Get full transcript for a recording              |
| `get_summary`       | Get AI-generated summary for a recording         |
| `list_teams`        | List all accessible teams                        |
| `list_team_members` | List members of a team                           |

### Limitations

- `search_meetings` performs client-side filtering as Fathom's API does not provide a search endpoint. For users with many meetings, consider using `list_meetings` with date filters instead.

## Project Structure

```
src/
├── shared/          # Config, constants, shared schemas
├── db/              # Drizzle ORM setup and schema
├── middleware/      # Auth, error handling, logging, rate limiting
├── modules/
│   ├── fathom/      # Fathom API client and schemas
│   ├── mcp/         # MCP session management
│   └── oauth/       # OAuth service and controllers
├── routes/          # Express route definitions
├── tools/           # MCP tool definitions and handlers
└── index.ts         # Application entry point
```

## Development

### Scripts

| Script                | Description                              |
| --------------------- | ---------------------------------------- |
| `npm run dev`         | Start development server with hot reload |
| `npm run build`       | Build for production                     |
| `npm start`           | Start production server                  |
| `npm run db:generate` | Generate database migrations             |
| `npm run db:migrate`  | Run database migrations                  |
| `npm run db:push`     | Push schema directly to database         |

## Contributing

Contributions are welcome. Please open an issue to discuss proposed changes before submitting a pull request.

## License

MIT License - see [LICENSE](LICENSE) for details.
