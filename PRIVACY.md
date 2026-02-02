# Privacy Policy

**Last updated:** February 2026

## Overview

Fathom MCP Server is an open-source connector that allows Claude to access your Fathom meeting data. This policy explains what data we collect, how we use it, and your rights.

## Data We Collect

### OAuth Tokens

When you authenticate with Fathom through this server, we store:

- **Fathom OAuth access token** — Used to make API requests on your behalf
- **Fathom OAuth refresh token** — Used to obtain new access tokens when they expire

These tokens are encrypted at rest using AES-256-GCM before being stored in our database.

### What We Do NOT Collect or Store

- Meeting recordings
- Transcripts
- Summaries
- Team information
- Member information
- Any other Fathom data

All Fathom data flows directly from Fathom's API to Claude without being stored, cached, or logged by this server.

## How We Use Your Data

OAuth tokens are used solely to authenticate requests to the Fathom API on your behalf. We do not:

- Sell your data
- Share your data with third parties
- Use your data for analytics
- Use your data for advertising
- Access your Fathom data except when you explicitly request it through Claude

## Data Security

- **Encryption at rest**: OAuth tokens are encrypted using AES-256-GCM
- **Encryption in transit**: All communication uses HTTPS/TLS
- **No logging**: Fathom data is never written to logs
- **Pass-through architecture**: Your meeting data flows directly from Fathom to Claude

## Data Retention

OAuth tokens are retained until:

- You disconnect the server from Claude
- You revoke access through Fathom
- The tokens expire and cannot be refreshed

## Your Rights

You can:

- **Disconnect** at any time through Claude Desktop settings
- **Revoke access** through your Fathom account settings
- **Request deletion** by contacting us at the support channel below

## Third-Party Services

This server connects to:

- **Fathom** ([fathom.video](https://fathom.video)) — See [Fathom's Privacy Policy](https://fathom.video/privacy)
- **Claude** ([claude.ai](https://claude.ai)) — See [Anthropic's Privacy Policy](https://www.anthropic.com/privacy)

## Open Source

This project is open source. You can review the code at:
https://github.com/agencyenterprise/fathom-mcp-server

## Contact

For privacy concerns or data deletion requests:
https://github.com/agencyenterprise/fathom-mcp-server/issues

## Changes

We may update this policy as needed. Changes will be reflected in the "Last updated" date above.
