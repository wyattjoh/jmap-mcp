import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { connectJmap } from "@wyattjoh/jmap";
import { z } from "zod";

import deno from "../deno.json" with { type: "json" };
import { registerEmailTools } from "./tools/email.ts";
import { registerEmailSubmissionTools } from "./tools/submission.ts";
import { formatError } from "./utils.ts";

const JMAPConfigSchema = z.object({
  sessionUrl: z.string().url().describe("JMAP server session URL"),
  bearerToken: z.string().min(1).describe("Bearer token for authentication"),
  accountId: z.string().optional().describe(
    "Account ID (will be auto-detected if not provided)",
  ),
});

const getJMAPConfig = () => {
  const sessionUrl = Deno.env.get("JMAP_SESSION_URL");
  const bearerToken = Deno.env.get("JMAP_BEARER_TOKEN");
  const accountId = Deno.env.get("JMAP_ACCOUNT_ID");

  if (!sessionUrl || !bearerToken) {
    throw new Error(
      "Missing required environment variables: JMAP_SESSION_URL and JMAP_BEARER_TOKEN",
    );
  }

  return JMAPConfigSchema.parse({
    sessionUrl,
    bearerToken,
    accountId,
  });
};

const createServer = async () => {
  const server = new McpServer({
    name: "jmap",
    version: deno.version,
  });

  const config = getJMAPConfig();
  const connection = await connectJmap({
    sessionUrl: config.sessionUrl,
    bearerToken: config.bearerToken,
    accountId: config.accountId,
  });

  if ("urn:ietf:params:jmap:mail" in connection.capabilities) {
    registerEmailTools(server, connection);
    console.warn("Registered urn:ietf:params:jmap:mail tools");

    if (
      "urn:ietf:params:jmap:submission" in connection.capabilities &&
      !connection.isReadOnly
    ) {
      registerEmailSubmissionTools(server, connection);
      console.warn("Registered urn:ietf:params:jmap:submission tools");
    } else {
      console.warn(
        "JMAP mail submission capabilities not supported or is read only, email submission tools will not be available",
      );
    }
  } else {
    throw new Error(
      "JMAP mail capabilities not supported but required for this server",
    );
  }

  return server;
};

const main = async () => {
  const transport = new StdioServerTransport();

  let server: McpServer;
  try {
    server = await createServer();
  } catch (error) {
    console.error("JMAP connection failed:", formatError(error));
    console.error(
      "Please check your JMAP_SESSION_URL and JMAP_BEARER_TOKEN environment variables.",
    );
    Deno.exit(1);
  }

  await server.connect(transport);
  console.warn("JMAP MCP Server running on stdio");
};

if (import.meta.main) {
  main().catch((error) => {
    console.error("Fatal error in main():", error);
    Deno.exit(1);
  });
}
