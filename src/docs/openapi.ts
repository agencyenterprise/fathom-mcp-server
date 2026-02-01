import { z } from "zod";
import { createDocument, type oas31 } from "zod-openapi";
import { listMeetingsResSchema } from "../modules/fathom/schema";
import { config } from "../shared/config";
import { searchMeetingsReqSchema } from "../shared/schemas";

const searchMeetingsRequest = searchMeetingsReqSchema.meta({
  description: "Search parameters for finding meetings by title",
  example: {
    query: "weekly standup",
    calendar_invitees_domains: ["acme.com", "partner.io"],
    calendar_invitees_domains_type: "all",
    created_after: "2024-01-01T00:00:00Z",
    created_before: "2024-12-31T23:59:59Z",
    cursor: "abc123",
    include_action_items: true,
    include_crm_matches: false,
    recorded_by: ["john@company.com", "jane@company.com"],
    teams: ["Engineering", "Sales"],
  },
});

const searchMeetingsResponse = z
  .object({
    items: listMeetingsResSchema.shape.items,
  })
  .meta({
    description: "Filtered list of meetings matching the search query",
  });

export const openapiDocument: oas31.OpenAPIObject = createDocument({
  openapi: "3.1.0",
  info: {
    title: "Fathom MCP Server - Custom Tools",
    version: config.version,
    description:
      "Documentation for custom MCP tools built for this server. " +
      "These tools don't exist in the Fathom API.",
  },
  servers: [
    {
      url: config.baseUrl,
      description: "MCP Server",
    },
  ],
  paths: {
    "/mcp/tools/search_meetings": {
      post: {
        operationId: "search_meetings",
        summary: "Search Meetings",
        description:
          "Search Fathom meetings by title. This is an MCP-native tool that " +
          "performs client-side filtering since Fathom's API doesn't provide a search endpoint. " +
          "For users with many meetings, consider using list_meetings with date filters for better performance.",
        tags: ["Custom MCP Tools"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: searchMeetingsRequest,
            },
          },
        },
        responses: {
          "200": {
            description: "Meetings matching the search query",
            content: {
              "application/json": {
                schema: searchMeetingsResponse,
              },
            },
          },
        },
      },
    },
  },
});
