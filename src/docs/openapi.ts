import { z } from "zod";
import { createDocument, type oas31 } from "zod-openapi";
import { listMeetingsResSchema } from "../modules/fathom/schema";
import { config } from "../shared/config";
import { searchMeetingsReqSchema } from "../shared/schemas";
import {
  searchMeetingsRequestExample,
  searchMeetingsResponseExample,
} from "./examples";

const searchMeetingsRequest = searchMeetingsReqSchema.meta({
  description: "Search parameters for finding meetings by title, host, or attendee information",
  example: searchMeetingsRequestExample,
});

const searchMeetingsResponse = z
  .object({
    items: listMeetingsResSchema.shape.items,
    next_cursor: z.string().nullable(),
    total_searched: z.number(),
  })
  .meta({
    description: "Filtered list of meetings matching the search query with pagination metadata",
    example: searchMeetingsResponseExample,
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
          "Search Fathom meetings by title, meeting title, host name, host email, or attendee name/email. " +
          "Automatically scans up to 5 pages of results. This is an MCP-native tool that " +
          "performs client-side filtering since Fathom's API doesn't provide a search endpoint.",
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
