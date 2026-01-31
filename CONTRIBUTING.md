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

### 3. Initialize Database

```bash
railway run npm run db:push
```

### 4. Test Your Changes

1. Make changes locally
2. Push to your fork (Railway auto-deploys)
3. Test via Claude Desktop connected to your deployment

## Code Style

- Run `npm run lint` before committing
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

1. Create a feature branch from `main`
2. Make your changes
3. Ensure `npm run lint` passes
4. Submit a PR with a clear description of what changed and why

## Reporting Issues

- Check existing issues first
- Include steps to reproduce
- Include relevant error messages or logs

## Questions?

Open an issue or discussion if something is unclear.
