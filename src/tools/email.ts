import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type JamClient from "jmap-jam";
import type { GetEmailArguments } from "jmap-jam";
import type {
  Email,
  EmailCreate,
  EmailFilterCondition,
  FilterCondition,
  MailboxFilterCondition,
} from "jmap-rfc-types";
import { formatError, jsonStringify } from "../utils.ts";

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
    "Search within email body text content only (excludes headers). Unlike 'query' which searches all fields, this targets just the message body.",
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
    "Specific Email properties to return. ALWAYS specify to avoid large responses. Common sets: summary=['id','subject','from','to','receivedAt','preview'], full=['id','subject','from','to','cc','receivedAt','bodyValues','textBody','htmlBody','keywords','mailboxIds']. Note: 'bodyValues' alone won't return content — also include 'textBody' and/or 'htmlBody'.",
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

export const GetEmailChangesSchema = z.object({
  sinceState: z.string().describe(
    "The state string from a previous get_emails response. The server will return all changes since this state.",
  ),
  maxChanges: z.number().min(1).max(500).optional().describe(
    "Maximum number of changes to return. Server may return fewer.",
  ),
  fetchEmails: z.boolean().default(false).describe(
    "If true, automatically fetch full details for created and updated email IDs.",
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
    "Email properties to fetch when fetchEmails is true. Defaults to all properties.",
  ),
});

export const GetSearchUpdatesSchema = z.object({
  sinceQueryState: z.string().describe(
    "The queryState string from a previous search_emails response. Must be used with the same filter parameters as the original search.",
  ),
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
  allInThreadHaveKeyword: z.string().optional().describe(
    "All Emails in the same Thread must have the given keyword to match the condition.",
  ),
  someInThreadHaveKeyword: z.string().optional().describe(
    "At least one Email in the same Thread must have the given keyword to match the condition.",
  ),
  body: z.string().optional().describe(
    "Search in email body content.",
  ),
  maxChanges: z.number().min(1).max(500).optional().describe(
    "Maximum number of changes to return.",
  ),
});

const buildEmailFilter = (
  args: Partial<z.infer<typeof SearchEmailsSchema>>,
) => {
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
    "Search emails with filters (text, sender/recipient, dates, keywords). All filters are AND'd together. Returns only email IDs — use get_emails to fetch full content. For listing emails, request only the properties you need (e.g., ['id', 'subject', 'from', 'receivedAt', 'preview'] for a summary). Results are paginated: each response includes `total` (total matching emails), `position` (current offset), and `hasMore` (boolean). To get the next page, call again with `position` set to the current `position + ids.length`. Do NOT fetch all pages unless explicitly asked — the first page is usually sufficient. Also returns `queryState` for incremental sync via get_search_updates.",
    SearchEmailsSchema.shape,
    async (args: z.infer<typeof SearchEmailsSchema>) => {
      try {
        const filter = buildEmailFilter(args);

        const [result] = await jam.api.Email.query({
          accountId,
          filter,
          limit: args.limit,
          position: args.position,
          calculateTotal: true,
          sort: [{ property: "receivedAt", isAscending: false }],
        });

        return {
          content: [
            {
              type: "text",
              text: jsonStringify({
                ids: result.ids,
                total: result.total,
                position: result.position,
                nextPosition: result.position + result.ids.length,
                hasMore:
                  result.position + result.ids.length < (result.total || 0),
                _pagination: `Showing ${result.ids.length} of ${
                  result.total ?? "unknown"
                } results (position ${result.position}–${
                  result.position + result.ids.length - 1
                })`,
                queryState: result.queryState,
                canCalculateChanges: result.canCalculateChanges,
              }),
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
    "Get list of mailboxes/folders with their IDs, names, and metadata. Call this first to get mailbox IDs needed for search_emails (inMailbox filter) and move_emails (mailboxId). Common mailbox names: Inbox, Drafts, Sent, Trash, Archive, Spam/Junk. Results are paginated - use position parameter for pagination.",
    GetMailboxesSchema.shape,
    async (args: z.infer<typeof GetMailboxesSchema>) => {
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
          calculateTotal: true,
          sort: [{ property: "sortOrder", isAscending: true }],
        });

        const [mailboxes] = await jam.api.Mailbox.get({
          accountId,
          ids: result.ids,
        });

        return {
          content: [
            {
              type: "text",
              text: jsonStringify({
                mailboxes: mailboxes.list,
                total: result.total,
                position: result.position,
                hasMore:
                  result.position + result.ids.length < (result.total || 0),
              }),
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
    "Get specific emails by their IDs. Use the `properties` parameter to request only what you need — requesting all properties returns large payloads. Recommended property sets: summary: ['id', 'subject', 'from', 'to', 'receivedAt', 'preview', 'keywords', 'mailboxIds'], full read: ['id', 'subject', 'from', 'to', 'cc', 'receivedAt', 'bodyValues', 'textBody', 'htmlBody']. IMPORTANT: to get body content, you must include 'bodyValues' AND at least one of 'textBody' or 'htmlBody' in properties. Returns `state` for incremental sync via get_email_changes.",
    GetEmailsSchema.shape,
    async (args: z.infer<typeof GetEmailsSchema>) => {
      try {
        const [result] = await jam.api.Email.get(
          {
            accountId,
            ids: args.ids,
            properties: args.properties,
          } satisfies GetEmailArguments,
        );

        return {
          content: [
            {
              type: "text",
              text: jsonStringify({
                emails: result.list,
                notFound: result.notFound,
                state: result.state,
              }),
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
    "Get email threads by their IDs. Thread IDs are available from get_emails responses (threadId property). Returns a list of email IDs in each thread — use get_emails on those IDs to fetch the actual email content.",
    GetThreadsSchema.shape,
    async (args: z.infer<typeof GetThreadsSchema>) => {
      try {
        const [result] = await jam.api.Thread.get({
          accountId,
          ids: args.ids,
        });

        return {
          content: [
            {
              type: "text",
              text: jsonStringify({
                threads: result.list,
                notFound: result.notFound,
              }),
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

  server.tool(
    "get_email_changes",
    "Get IDs of emails created, updated, or destroyed since a previous state. Use the state string from a get_emails response. Supports optional auto-fetching of full email details. If the state is too old, falls back with an error suggesting a fresh search_emails call.",
    GetEmailChangesSchema.shape,
    async (args: z.infer<typeof GetEmailChangesSchema>) => {
      try {
        const [changesResult] = await jam.api.Email.changes({
          accountId,
          sinceState: args.sinceState,
          maxChanges: args.maxChanges,
        });

        const response: Record<string, unknown> = {
          oldState: changesResult.oldState,
          newState: changesResult.newState,
          hasMoreChanges: changesResult.hasMoreChanges,
          created: changesResult.created,
          updated: changesResult.updated,
          destroyed: changesResult.destroyed,
        };

        if (
          args.fetchEmails &&
          (changesResult.created.length > 0 ||
            changesResult.updated.length > 0)
        ) {
          const idsToFetch = [
            ...changesResult.created,
            ...changesResult.updated,
          ];
          const [emailResult] = await jam.api.Email.get(
            {
              accountId,
              ids: idsToFetch,
              properties: args.properties,
            } satisfies GetEmailArguments,
          );
          response.emails = emailResult.list;
        }

        return {
          content: [
            {
              type: "text",
              text: jsonStringify(response),
            },
          ],
        };
      } catch (error) {
        const errorStr = formatError(error);
        if (errorStr.includes("cannotCalculateChanges")) {
          return {
            content: [
              {
                type: "text",
                text: jsonStringify({
                  error: "cannotCalculateChanges",
                  message:
                    "The provided state is too old or the server cannot calculate changes. Please perform a fresh search_emails call to get the current state.",
                }),
              },
            ],
          };
        }
        return {
          content: [
            {
              type: "text",
              text: `Error getting email changes: ${errorStr}`,
            },
          ],
        };
      }
    },
  );

  server.tool(
    "get_search_updates",
    "Get changes within a previous search query since its last queryState. You MUST pass the same filter parameters as the original search_emails call. Returns added and removed email IDs relative to that search.",
    GetSearchUpdatesSchema.shape,
    async (args: z.infer<typeof GetSearchUpdatesSchema>) => {
      try {
        const filter = buildEmailFilter(args);

        const [result] = await jam.api.Email.queryChanges({
          accountId,
          sinceQueryState: args.sinceQueryState,
          filter,
          sort: [{ property: "receivedAt", isAscending: false }],
          maxChanges: args.maxChanges,
        });

        return {
          content: [
            {
              type: "text",
              text: jsonStringify({
                oldQueryState: result.oldQueryState,
                newQueryState: result.newQueryState,
                added: result.added,
                removed: result.removed,
                total: result.total,
              }),
            },
          ],
        };
      } catch (error) {
        const errorStr = formatError(error);
        if (errorStr.includes("cannotCalculateChanges")) {
          return {
            content: [
              {
                type: "text",
                text: jsonStringify({
                  error: "cannotCalculateChanges",
                  message:
                    "The provided queryState is too old or the server cannot calculate changes. Please perform a fresh search_emails call to get the current state.",
                }),
              },
            ],
          };
        }
        return {
          content: [
            {
              type: "text",
              text: `Error getting search updates: ${errorStr}`,
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
      async (args: z.infer<typeof MarkEmailsSchema>) => {
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
          });

          return {
            content: [
              {
                type: "text",
                text: jsonStringify({
                  updated: result.updated,
                  notUpdated: result.notUpdated,
                }),
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
      "Move emails to a different mailbox. Requires a mailbox ID — use get_mailboxes first to find the target mailbox ID by name.",
      MoveEmailsSchema.shape,
      async (args: z.infer<typeof MoveEmailsSchema>) => {
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
          });

          return {
            content: [
              {
                type: "text",
                text: jsonStringify({
                  updated: result.updated,
                  notUpdated: result.notUpdated,
                }),
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
      "Delete emails permanently. This action cannot be undone. Prefer move_emails to Trash mailbox for safer deletion — use this only when permanent deletion is explicitly requested.",
      DeleteEmailsSchema.shape,
      async (args: z.infer<typeof DeleteEmailsSchema>) => {
        try {
          const [result] = await jam.api.Email.set({
            accountId,
            destroy: args.ids,
          });

          return {
            content: [
              {
                type: "text",
                text: jsonStringify({
                  destroyed: result.destroyed,
                  notDestroyed: result.notDestroyed,
                }),
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
