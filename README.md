# Fathom MCP

An MCP (Model Context Protocol) server that connects Claude to your Fathom meetings, transcripts, and AI summaries.

## What It Does

Once connected, Claude can:

- **List your meetings** with optional date filters
- **Search meetings** by title
- **Read full transcripts** from any recording
- **Get AI summaries** of your meetings
- **Access team information** and member lists

## Quick Start Connect to Claude

Add this url as a custom connector to your claude desktop

```
https://fathom-mcp-production.up.railway.app/mcp
```

for beta you can add for the latest changes

```
https://fathom-mcp-staging.up.railway.app/mcp
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

## Limitations

- `search_meetings` performs client-side filtering since Fathom's API doesn't provide a search endpoint. For users with many meetings, use `list_meetings` with date filters instead.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.
