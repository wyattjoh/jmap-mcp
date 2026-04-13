import { assertEquals } from "@std/assert";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { registerEmailTools } from "./email.ts";

// Helper to create a mock JamClient with configurable API responses
function createMockJam(overrides: Record<string, unknown> = {}) {
  return {
    api: {
      Email: {
        query: overrides.emailQuery ??
          (() =>
            Promise.resolve([{
              ids: ["e1", "e2"],
              total: 2,
              position: 0,
              queryState: "qs-abc",
              canCalculateChanges: true,
            }])),
        get: overrides.emailGet ??
          (() =>
            Promise.resolve([{
              list: [{ id: "e1", subject: "Test" }],
              notFound: [],
              state: "state-123",
            }])),
        changes: overrides.emailChanges ??
          (() =>
            Promise.resolve([{
              oldState: "state-100",
              newState: "state-200",
              hasMoreChanges: false,
              created: ["e3"],
              updated: ["e1"],
              destroyed: ["e2"],
            }])),
        queryChanges: overrides.emailQueryChanges ??
          (() =>
            Promise.resolve([{
              oldQueryState: "qs-abc",
              newQueryState: "qs-def",
              added: [{ id: "e3", index: 0 }],
              removed: ["e2"],
              total: 2,
            }])),
        set: () => Promise.resolve([{ updated: {}, notUpdated: {} }]),
      },
      Mailbox: {
        query: () => Promise.resolve([{ ids: ["m1"], total: 1, position: 0 }]),
        get: () =>
          Promise.resolve([{
            list: [{ id: "m1", name: "Inbox" }],
            notFound: [],
          }]),
      },
      Thread: {
        get: () =>
          Promise.resolve([{
            list: [{ id: "t1", emailIds: ["e1"] }],
            notFound: [],
          }]),
      },
    },
  } as unknown;
}

// Helper to set up a connected MCP server+client pair with registered tools
async function setup(overrides: Record<string, unknown> = {}) {
  const jam = createMockJam(overrides);
  const server = new McpServer({ name: "test", version: "0.0.1" });
  registerEmailTools(server, jam as never, "acct-1", false);

  const [clientTransport, serverTransport] = InMemoryTransport
    .createLinkedPair();
  await server.connect(serverTransport);

  const client = new Client({ name: "test-client", version: "0.0.1" });
  await client.connect(clientTransport);

  return { server, client };
}

// deno-lint-ignore no-explicit-any
function parseResponse(result: any) {
  return JSON.parse(result.content[0].text);
}

Deno.test("get_emails returns state field", async () => {
  const { client } = await setup();
  const result = await client.callTool({
    name: "get_emails",
    arguments: { ids: ["e1"] },
  });
  const parsed = parseResponse(result);

  assertEquals(parsed.state, "state-123");
  assertEquals(parsed.emails.length, 1);
  assertEquals(parsed.notFound.length, 0);
});

Deno.test("get_email_changes returns created/updated/destroyed", async () => {
  const { client } = await setup();
  const result = await client.callTool({
    name: "get_email_changes",
    arguments: { sinceState: "state-100", fetchEmails: false },
  });
  const parsed = parseResponse(result);

  assertEquals(parsed.oldState, "state-100");
  assertEquals(parsed.newState, "state-200");
  assertEquals(parsed.hasMoreChanges, false);
  assertEquals(parsed.created, ["e3"]);
  assertEquals(parsed.updated, ["e1"]);
  assertEquals(parsed.destroyed, ["e2"]);
  assertEquals(parsed.emails, undefined);
});

Deno.test("get_email_changes with fetchEmails fetches details", async () => {
  const { client } = await setup({
    emailGet: () =>
      Promise.resolve([{
        list: [
          { id: "e3", subject: "New" },
          { id: "e1", subject: "Updated" },
        ],
        notFound: [],
        state: "state-200",
      }]),
  });
  const result = await client.callTool({
    name: "get_email_changes",
    arguments: { sinceState: "state-100", fetchEmails: true },
  });
  const parsed = parseResponse(result);

  assertEquals(parsed.emails.length, 2);
  assertEquals(parsed.emails[0].id, "e3");
  assertEquals(parsed.emails[1].id, "e1");
});

Deno.test("get_email_changes handles cannotCalculateChanges error", async () => {
  const { client } = await setup({
    emailChanges: () =>
      Promise.reject(new Error("cannotCalculateChanges: state too old")),
  });
  const result = await client.callTool({
    name: "get_email_changes",
    arguments: { sinceState: "ancient-state", fetchEmails: false },
  });
  const parsed = parseResponse(result);

  assertEquals(parsed.error, "cannotCalculateChanges");
});

Deno.test("get_search_updates returns added/removed", async () => {
  const { client } = await setup();
  const result = await client.callTool({
    name: "get_search_updates",
    arguments: { sinceQueryState: "qs-abc", inMailbox: "inbox-id" },
  });
  const parsed = parseResponse(result);

  assertEquals(parsed.oldQueryState, "qs-abc");
  assertEquals(parsed.newQueryState, "qs-def");
  assertEquals(parsed.added.length, 1);
  assertEquals(parsed.added[0].id, "e3");
  assertEquals(parsed.removed, ["e2"]);
  assertEquals(parsed.total, 2);
});

Deno.test("get_search_updates handles cannotCalculateChanges error", async () => {
  const { client } = await setup({
    emailQueryChanges: () =>
      Promise.reject(new Error("cannotCalculateChanges: query state too old")),
  });
  const result = await client.callTool({
    name: "get_search_updates",
    arguments: { sinceQueryState: "ancient-qs" },
  });
  const parsed = parseResponse(result);

  assertEquals(parsed.error, "cannotCalculateChanges");
});

Deno.test("search_emails returns queryState and canCalculateChanges", async () => {
  const { client } = await setup();
  const result = await client.callTool({
    name: "search_emails",
    arguments: { query: "test", limit: 10, position: 0 },
  });
  const parsed = parseResponse(result);

  assertEquals(parsed.queryState, "qs-abc");
  assertEquals(parsed.canCalculateChanges, true);
  assertEquals(parsed.ids, ["e1", "e2"]);
  assertEquals(parsed.total, 2);
  assertEquals(parsed.position, 0);
  assertEquals(parsed.nextPosition, 2);
  assertEquals(parsed.hasMore, false);
  assertEquals(
    parsed._pagination,
    "Showing 2 of 2 results (position 0\u20131)",
  );
});

Deno.test("search_emails pagination indicates hasMore when results exceed page", async () => {
  const { client } = await setup({
    emailQuery: () =>
      Promise.resolve([{
        ids: ["e1", "e2"],
        total: 10,
        position: 0,
        queryState: "qs-page",
        canCalculateChanges: true,
      }]),
  });
  const result = await client.callTool({
    name: "search_emails",
    arguments: { query: "test", limit: 2, position: 0 },
  });
  const parsed = parseResponse(result);

  assertEquals(parsed.hasMore, true);
  assertEquals(parsed.nextPosition, 2);
  assertEquals(parsed.total, 10);
  assertEquals(
    parsed._pagination,
    "Showing 2 of 10 results (position 0\u20131)",
  );
});

Deno.test("search_emails passes calculateTotal to Email.query", async () => {
  // deno-lint-ignore no-explicit-any
  let capturedArgs: any;
  const { client } = await setup({
    emailQuery: (args: unknown) => {
      capturedArgs = args;
      return Promise.resolve([{
        ids: ["e1"],
        total: 1,
        position: 0,
        queryState: "qs-1",
        canCalculateChanges: true,
      }]);
    },
  });
  await client.callTool({
    name: "search_emails",
    arguments: { query: "test" },
  });

  assertEquals(capturedArgs.calculateTotal, true);
});

Deno.test("get_mailboxes passes calculateTotal to Mailbox.query", async () => {
  // deno-lint-ignore no-explicit-any
  let capturedArgs: any;
  const jam = createMockJam();
  // Override Mailbox.query to capture args
  // deno-lint-ignore no-explicit-any
  (jam as any).api.Mailbox.query = (args: unknown) => {
    capturedArgs = args;
    return Promise.resolve([{ ids: ["m1"], total: 1, position: 0 }]);
  };

  const server = new McpServer({ name: "test", version: "0.0.1" });
  registerEmailTools(server, jam as never, "acct-1", false);

  const [clientTransport, serverTransport] = InMemoryTransport
    .createLinkedPair();
  await server.connect(serverTransport);

  const client = new Client({ name: "test-client", version: "0.0.1" });
  await client.connect(clientTransport);

  await client.callTool({
    name: "get_mailboxes",
    arguments: {},
  });

  assertEquals(capturedArgs.calculateTotal, true);
});
