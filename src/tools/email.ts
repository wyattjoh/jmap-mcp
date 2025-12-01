// @ts-nocheck - jmap-jam ProxyAPI types don't expose options param (runtime supports it)
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type JamClient from "jmap-jam";
import type {
  Email,
  EmailCreate,
  EmailFilterCondition,
  FilterCondition,
  GetEmailArguments,
  MailboxFilterCondition,
} from "jmap-jam";
import { formatError } from "../utils.ts";

// JMAP requires core capability in all requests
// jmap-jam's ProxyAPI types don't expose the options param, but runtime supports it
// deno-lint-ignore no-explicit-any
const JMAP_OPTIONS: any = { using: ["urn:ietf:params:jmap:core"] };

export const SearchEmailsSchema = z.object({
  query: z.string().optional().describe(
    "Text search query to find in email content",
  ),
  from: z.string().optional().describe("Email address to filter messages from"),
  to: z.string().optional().describe("Email address to filter messages to"),
  subject: z.string().optional().describe(
    "Text to search for in email subjects",
  ),
  inMailbox: z.string().optional().describe("Mailbox ID to search within"),
  hasKeyword: z.string().optional().describe(
    "Keyword to filter by (e.g., '$seen', '$flagged')",
  ),
  notKeyword: z.string().optional().describe(
    "Keyword to exclude (e.g., '$seen', '$draft')",
  ),
  before: z.string().datetime().optional().describe(
    "Only return emails before this date (ISO datetime)",
  ),
  after: z.string().datetime().optional().describe(
    "Only return emails after this date (ISO datetime)",
  ),
  limit: z.number().min(1).max(100).default(50).describe(
    "Maximum number of emails to return (1-100, default: 50)",
  ),
  position: z.number().min(0).default(0).describe(
    "Starting position for pagination (default: 0)",
  ),
  allInThreadHaveKeyword: z.string().optional().describe(
    "All Emails (including this one) in the same Thread as this Email must have the given keyword to match the condition.",
  ),
  someInThreadHaveKeyword: z.string().optional().describe(
    "At least one Email (including this one) in the same Thread as this Email must have the given keyword to match the condition.",
  ),
  body: z.string().optional().describe(
    "The server MAY exclude MIME body parts with content media types other than text/* and message/* from consideration in search matching. Care should be taken to match based on the text content actually presented to an end user by viewers for that media type or otherwise identified as appropriate for search indexing. Matching document metadata uninteresting to an end user (e.g., markup tag and attribute names) is undesirable.",
  ),
});

export const GetMailboxesSchema = z.object({
  parentId: z.string().optional().describe("Parent mailbox ID to filter by"),
  limit: z.number().min(1).max(200).default(100).describe(
    "Maximum number of mailboxes to return",
  ),
  position: z.number().min(0).default(0).describe(
    "Starting position for pagination",
  ),
});

export const GetEmailsSchema = z.object({
  ids: z.array(z.string()).min(1).max(50).describe(
    "Array of email IDs to retrieve",
  ),
  properties: z.array(z.enum(
    [
      "id",
      "blobId",
      "threadId",
      "mailboxIds",
      "keywords",
      "size",
      "receivedAt",
      "headers",
      "messageId",
      "inReplyTo",
      "references",
      "sender",
      "from",
      "to",
      "cc",
      "bcc",
      "replyTo",
      "subject",
      "sentAt",
      "bodyStructure",
      "bodyValues",
      "textBody",
      "htmlBody",
      "attachments",
      "hasAttachment",
      "preview",
    ] as const satisfies Array<keyof Email>,
  )).optional().describe(
    "Specific Email properties to return (default: all).",
  ),
});

export const GetThreadsSchema = z.object({
  ids: z.array(z.string()).min(1).max(20).describe(
    "Array of thread IDs to retrieve",
  ),
});

export const MarkEmailsSchema = z.object({
  ids: z.array(z.string()).min(1).max(100).describe(
    "Array of email IDs to mark",
  ),
  seen: z.boolean().optional().describe(
    "Mark as read (true) or unread (false)",
  ),
  flagged: z.boolean().optional().describe(
    "Mark as flagged (true) or unflagged (false)",
  ),
});

export const MoveEmailsSchema = z.object({
  ids: z.array(z.string()).min(1).max(100).describe(
    "Array of email IDs to move",
  ),
  mailboxId: z.string().describe("Target mailbox ID"),
});

export const DeleteEmailsSchema = z.object({
  ids: z.array(z.string()).min(1).max(100).describe(
    "Array of email IDs to delete",
  ),
});

const buildEmailFilter = (args: z.infer<typeof SearchEmailsSchema>) => {
  const filter: EmailFilterCondition = {};

  if (args.query) {
    filter.text = args.query;
  }
  if (args.from) {
    filter.from = args.from;
  }
  if (args.to) {
    filter.to = args.to;
  }
  if (args.subject) {
    filter.subject = args.subject;
  }
  if (args.inMailbox) {
    filter.inMailbox = args.inMailbox;
  }
  if (args.hasKeyword) {
    filter.hasKeyword = args.hasKeyword;
  }
  if (args.notKeyword) {
    filter.notKeyword = args.notKeyword;
  }
  if (args.before) {
    filter.before = args.before;
  }
  if (args.after) {
    filter.after = args.after;
  }
  if (args.allInThreadHaveKeyword) {
    filter.allInThreadHaveKeyword = args.allInThreadHaveKeyword;
  }
  if (args.someInThreadHaveKeyword) {
    filter.someInThreadHaveKeyword = args.someInThreadHaveKeyword;
  }
  if (args.body) {
    filter.body = args.body;
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
};

export function registerEmailTools(
  server: McpServer,
  jam: JamClient,
  accountId: string,
  isReadOnly: boolean,
) {
  server.tool(
    "search_emails",
    "Search emails with various filters including text search, sender/recipient filters, date ranges, and keywords. Results are paginated - use position parameter for pagination.",
    SearchEmailsSchema.shape,
    async (args) => {
      try {
        const filter = buildEmailFilter(args);

        const [result] = await jam.api.Email.query({
          accountId,
          filter,
          limit: args.limit,
          position: args.position,
          sort: [{ property: "receivedAt", isAscending: false }],
        }, JMAP_OPTIONS);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ids: result.ids,
                  total: result.total,
                  position: result.position,
                  queryState: result.queryState,
                  canCalculateChanges: result.canCalculateChanges,
                  hasMore:
                    result.position + result.ids.length < (result.total || 0),
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error searching emails: ${formatError(error)}`,
            },
          ],
        };
      }
    },
  );

  server.tool(
    "get_mailboxes",
    "Get list of mailboxes/folders. Results are paginated - use position parameter for pagination.",
    GetMailboxesSchema.shape,
    async (args) => {
      try {
        let filter: FilterCondition<MailboxFilterCondition> | undefined;
        if (args.parentId) {
          filter = { parentId: args.parentId };
        }

        const [result] = await jam.api.Mailbox.query({
          accountId,
          filter,
          limit: args.limit,
          position: args.position,
          sort: [{ property: "sortOrder", isAscending: true }],
        }, JMAP_OPTIONS);

        const [mailboxes] = await jam.api.Mailbox.get({
          accountId,
          ids: result.ids,
        }, JMAP_OPTIONS);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  mailboxes: mailboxes.list,
                  total: result.total,
                  position: result.position,
                  hasMore:
                    result.position + result.ids.length < (result.total || 0),
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting mailboxes: ${formatError(error)}`,
            },
          ],
        };
      }
    },
  );

  server.tool(
    "get_emails",
    "Get specific emails by their IDs. Returns full email details including headers, body, and attachments.",
    GetEmailsSchema.shape,
    async (args) => {
      try {
        const [result] = await jam.api.Email.get(
          {
            accountId,
            ids: args.ids,
            properties: args.properties,
          } satisfies GetEmailArguments,
          JMAP_OPTIONS,
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  emails: result.list,
                  notFound: result.notFound,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting emails: ${formatError(error)}`,
            },
          ],
        };
      }
    },
  );

  server.tool(
    "get_threads",
    "Get email threads by their IDs. A thread contains multiple related emails.",
    GetThreadsSchema.shape,
    async (args) => {
      try {
        const [result] = await jam.api.Thread.get({
          accountId,
          ids: args.ids,
        }, JMAP_OPTIONS);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  threads: result.list,
                  notFound: result.notFound,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting threads: ${formatError(error)}`,
            },
          ],
        };
      }
    },
  );

  if (!isReadOnly) {
    server.tool(
      "mark_emails",
      "Mark emails as read/unread or flagged/unflagged. You can update multiple keywords at once.",
      MarkEmailsSchema.shape,
      async (args) => {
        try {
          const updates: Record<string, EmailCreate> = {};

          for (const id of args.ids) {
            const keywords: Record<string, boolean> = {};

            if (args.seen !== undefined) {
              keywords["$seen"] = args.seen;
            }
            if (args.flagged !== undefined) {
              keywords["$flagged"] = args.flagged;
            }

            updates[id] = { keywords };
          }

          const [result] = await jam.api.Email.set({
            accountId,
            update: updates,
          }, JMAP_OPTIONS);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    updated: result.updated,
                    notUpdated: result.notUpdated,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error marking emails: ${formatError(error)}`,
              },
            ],
          };
        }
      },
    );

    server.tool(
      "move_emails",
      "Move emails from their current mailbox to a different mailbox.",
      MoveEmailsSchema.shape,
      async (args) => {
        try {
          const updates: Record<string, EmailCreate> = {};

          for (const id of args.ids) {
            updates[id] = {
              mailboxIds: { [args.mailboxId]: true },
            };
          }

          const [result] = await jam.api.Email.set({
            accountId,
            update: updates,
          }, JMAP_OPTIONS);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    updated: result.updated,
                    notUpdated: result.notUpdated,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error moving emails: ${formatError(error)}`,
              },
            ],
          };
        }
      },
    );

    server.tool(
      "delete_emails",
      "Delete emails permanently. This action cannot be undone.",
      DeleteEmailsSchema.shape,
      async (args) => {
        try {
          const [result] = await jam.api.Email.set({
            accountId,
            destroy: args.ids,
          }, JMAP_OPTIONS);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    destroyed: result.destroyed,
                    notDestroyed: result.notDestroyed,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error deleting emails: ${formatError(error)}`,
              },
            ],
          };
        }
      },
    );
  }
}
