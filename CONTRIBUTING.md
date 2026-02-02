# Contributing to Fathom MCP

Thanks for your interest in contributing!

## Development Setup

Fathom OAuth apps require HTTPS redirect URIs, so you'll need to deploy to test the full OAuth flow.

### 1. Fork and Deploy

1. Fork this repository
2. Deploy to [Railway](https://railway.app) (free tier works)
3. Add a PostgreSQL database to your project
4. Set environment variables (see README)

### 2. Create Your Own Fathom OAuth App

1. Go to [Fathom Developer Portal](https://developers.fathom.ai/oauth)
2. Register a new app pointing to your deployed URL
3. Set redirect URI: `https://your-app.railway.app/oauth/fathom/callback`

### 3. Initialize Database Schema

After adding a PostgreSQL database to your Railway project (step 1.3) and copying `DATABASE_URL` to your local `.env`:

```bash
npm run db:migrate
```

This connects to your Railway database and creates the required tables.

### Making Database Schema Changes

If your PR modifies `src/db/schema.ts`:

1. Make your schema changes
2. Run `npm run db:generate` to create a migration file
3. Run `npm run db:migrate` to apply it to your Railway database
4. Commit both the schema change and the new migration file in `drizzle/migrations/`

> **Note**: After your PR is merged, a maintainer will run migrations against staging/production. This may change in the future.

### 4. Test Your Changes

1. Make changes locally
2. Push to your fork (Railway auto-deploys)
3. Test via Claude Desktop connected to your deployment

## Code Style

- Run `npm run ci` before committing (runs lint, typecheck, and build)
- Run `npm run format` to auto-format with Prettier
- Follow existing patterns in the codebase

## Project Structure

```
src/
├── db/                 # Database schema and connection
├── middleware/         # Express middleware (auth, errors, logging, rate limiting)
├── modules/            # Feature modules
│   ├── fathom/         # Fathom API integration
│   ├── oauth/          # OAuth flow handling
│   └── sessions/       # MCP session management
├── routes/             # Express route definitions
├── shared/             # Shared config, constants, errors, schemas
├── tools/              # MCP tool definitions and handlers
└── utils/              # Utility functions
```

## Pull Requests

1. Create a feature branch from `staging`
2. Make your changes
3. Run `npm run ci` to ensure all checks pass
4. Open a PR **targeting the `staging` branch** (not `main`)
5. Include a clear description of what changed and why

> **Important**: All PRs should be opened against `staging`. The `main` branch is reserved for production releases.

## Reporting Issues

- Check existing issues first
- Include steps to reproduce
- Include relevant error messages or logs

## Questions?

Open an issue or discussion if something is unclear.
