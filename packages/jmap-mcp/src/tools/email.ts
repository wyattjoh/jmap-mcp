import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  deleteEmails,
  type Email,
  type EmailFilterCondition,
  getEmailChanges,
  getEmails,
  getMailboxes,
  getSearchUpdates,
  getThreads,
  type JmapConnection,
  markEmails,
  moveEmails,
  patchEmailMailboxes,
  searchEmails,
} from "@wyattjoh/jmap";
import { z } from "zod";
import { formatError, jsonStringify } from "../utils.ts";

const EMAIL_PROPERTIES = [
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
] as const satisfies readonly (keyof Email)[];

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
  properties: z.array(z.enum(EMAIL_PROPERTIES)).optional().describe(
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

export const PatchEmailMailboxesSchema = z.object({
  ids: z.array(z.string()).min(1).max(100).describe(
    "Array of email IDs whose mailbox memberships should change",
  ),
  addMailboxIds: z.array(z.string()).max(100).default([]).describe(
    "Mailbox IDs to add while preserving unspecified memberships",
  ),
  removeMailboxIds: z.array(z.string()).max(100).default([]).describe(
    "Mailbox IDs to remove while preserving unspecified memberships",
  ),
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
  properties: z.array(z.enum(EMAIL_PROPERTIES)).optional().describe(
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
  body: z.string().optional().describe("Search in email body content."),
  maxChanges: z.number().min(1).max(500).optional().describe(
    "Maximum number of changes to return.",
  ),
});

const buildEmailFilter = (
  args: Partial<z.infer<typeof SearchEmailsSchema>>,
): EmailFilterCondition | undefined => {
  const filter: EmailFilterCondition = {};

  if (args.query) filter.text = args.query;
  if (args.from) filter.from = args.from;
  if (args.to) filter.to = args.to;
  if (args.subject) filter.subject = args.subject;
  if (args.inMailbox) filter.inMailbox = args.inMailbox;
  if (args.hasKeyword) filter.hasKeyword = args.hasKeyword;
  if (args.notKeyword) filter.notKeyword = args.notKeyword;
  if (args.before) filter.before = args.before;
  if (args.after) filter.after = args.after;
  if (args.allInThreadHaveKeyword) {
    filter.allInThreadHaveKeyword = args.allInThreadHaveKeyword;
  }
  if (args.someInThreadHaveKeyword) {
    filter.someInThreadHaveKeyword = args.someInThreadHaveKeyword;
  }
  if (args.body) filter.body = args.body;

  return Object.keys(filter).length > 0 ? filter : undefined;
};

const textResult = (value: unknown) => ({
  content: [{ type: "text" as const, text: jsonStringify(value) }],
});

const errorResult = (prefix: string, error: unknown) => ({
  content: [{
    type: "text" as const,
    text: `${prefix}: ${formatError(error)}`,
  }],
});

const changesErrorResult = (
  error: unknown,
  noun: "state" | "queryState",
  freshTool: "search_emails",
) => {
  const errorText = formatError(error);
  if (!errorText.includes("cannotCalculateChanges")) return undefined;

  return textResult({
    error: "cannotCalculateChanges",
    message:
      `The provided ${noun} is too old or the server cannot calculate changes. Please perform a fresh ${freshTool} call to get the current state.`,
  });
};

/**
 * Registers MCP email tools backed by the reusable JMAP client package.
 *
 * @param server MCP server receiving tool registrations.
 * @param connection Authenticated JMAP connection captured by handlers.
 */
export function registerEmailTools(
  server: McpServer,
  connection: JmapConnection,
): void {
  server.tool(
    "search_emails",
    "Search emails with filters (text, sender/recipient, dates, keywords). All filters are AND'd together. Returns only email IDs — use get_emails to fetch full content. For listing emails, request only the properties you need (e.g., ['id', 'subject', 'from', 'receivedAt', 'preview'] for a summary). Results are paginated: each response includes `total` (total matching emails), `position` (current offset), and `hasMore` (boolean). To get the next page, call again with `position` set to the current `position + ids.length`. Do NOT fetch all pages unless explicitly asked — the first page is usually sufficient. Also returns `queryState` for incremental sync via get_search_updates.",
    SearchEmailsSchema.shape,
    async (args: z.infer<typeof SearchEmailsSchema>) => {
      try {
        const result = await searchEmails(connection, {
          filter: buildEmailFilter(args),
          limit: args.limit,
          position: args.position,
        });
        return textResult({
          ...result,
          _pagination: `Showing ${result.ids.length} of ${
            result.total ?? "unknown"
          } results (position ${result.position}–${
            result.position + result.ids.length - 1
          })`,
        });
      } catch (error) {
        return errorResult("Error searching emails", error);
      }
    },
  );

  server.tool(
    "get_mailboxes",
    "Get list of mailboxes/folders with their IDs, names, and metadata. Call this first to get mailbox IDs needed for search_emails (inMailbox filter) and move_emails (mailboxId). Common mailbox names: Inbox, Drafts, Sent, Trash, Archive, Spam/Junk. Results are paginated - use position parameter for pagination.",
    GetMailboxesSchema.shape,
    async (args: z.infer<typeof GetMailboxesSchema>) => {
      try {
        return textResult(
          await getMailboxes(connection, {
            parentId: args.parentId,
            limit: args.limit,
            position: args.position,
          }),
        );
      } catch (error) {
        return errorResult("Error getting mailboxes", error);
      }
    },
  );

  server.tool(
    "get_emails",
    "Get specific emails by their IDs. Use the `properties` parameter to request only what you need — requesting all properties returns large payloads. Recommended property sets: summary: ['id', 'subject', 'from', 'to', 'receivedAt', 'preview', 'keywords', 'mailboxIds'], full read: ['id', 'subject', 'from', 'to', 'cc', 'receivedAt', 'bodyValues', 'textBody', 'htmlBody']. To get body content, include 'bodyValues' AND at least one of 'textBody' or 'htmlBody' in properties — the server will automatically fetch the corresponding body values. Returns `state` for incremental sync via get_email_changes.",
    GetEmailsSchema.shape,
    async (args: z.infer<typeof GetEmailsSchema>) => {
      try {
        return textResult(
          await getEmails(connection, {
            ids: args.ids,
            properties: args.properties,
          }),
        );
      } catch (error) {
        return errorResult("Error getting emails", error);
      }
    },
  );

  server.tool(
    "get_threads",
    "Get email threads by their IDs. Thread IDs are available from get_emails responses (threadId property). Returns a list of email IDs in each thread — use get_emails on those IDs to fetch the actual email content.",
    GetThreadsSchema.shape,
    async (args: z.infer<typeof GetThreadsSchema>) => {
      try {
        return textResult(await getThreads(connection, { ids: args.ids }));
      } catch (error) {
        return errorResult("Error getting threads", error);
      }
    },
  );

  server.tool(
    "get_email_changes",
    "Get IDs of emails created, updated, or destroyed since a previous state. Use the state string from a get_emails response. Supports optional auto-fetching of full email details. If the state is too old, falls back with an error suggesting a fresh search_emails call.",
    GetEmailChangesSchema.shape,
    async (args: z.infer<typeof GetEmailChangesSchema>) => {
      try {
        return textResult(
          await getEmailChanges(connection, {
            sinceState: args.sinceState,
            maxChanges: args.maxChanges,
            fetchEmails: args.fetchEmails,
            properties: args.properties,
          }),
        );
      } catch (error) {
        return changesErrorResult(error, "state", "search_emails") ??
          errorResult("Error getting email changes", error);
      }
    },
  );

  server.tool(
    "get_search_updates",
    "Get changes within a previous search query since its last queryState. You MUST pass the same filter parameters as the original search_emails call. Returns added and removed email IDs relative to that search.",
    GetSearchUpdatesSchema.shape,
    async (args: z.infer<typeof GetSearchUpdatesSchema>) => {
      try {
        return textResult(
          await getSearchUpdates(connection, {
            sinceQueryState: args.sinceQueryState,
            filter: buildEmailFilter(args),
            maxChanges: args.maxChanges,
          }),
        );
      } catch (error) {
        return changesErrorResult(error, "queryState", "search_emails") ??
          errorResult("Error getting search updates", error);
      }
    },
  );

  if (connection.isReadOnly) return;

  server.tool(
    "mark_emails",
    "Mark emails as read/unread or flagged/unflagged. You can update multiple keywords at once.",
    MarkEmailsSchema.shape,
    async (args: z.infer<typeof MarkEmailsSchema>) => {
      try {
        return textResult(
          await markEmails(connection, {
            ids: args.ids,
            seen: args.seen,
            flagged: args.flagged,
          }),
        );
      } catch (error) {
        return errorResult("Error marking emails", error);
      }
    },
  );

  server.tool(
    "move_emails",
    "Move emails to a different mailbox. Requires a mailbox ID — use get_mailboxes first to find the target mailbox ID by name.",
    MoveEmailsSchema.shape,
    async (args: z.infer<typeof MoveEmailsSchema>) => {
      try {
        return textResult(await moveEmails(connection, args));
      } catch (error) {
        return errorResult("Error moving emails", error);
      }
    },
  );

  server.tool(
    "patch_email_mailboxes",
    "Add or remove mailbox memberships without changing unspecified memberships. Use this to apply multiple labels or archive an email while preserving other labels.",
    PatchEmailMailboxesSchema.shape,
    async (args: z.infer<typeof PatchEmailMailboxesSchema>) => {
      try {
        return textResult(await patchEmailMailboxes(connection, args));
      } catch (error) {
        return errorResult("Error patching email mailboxes", error);
      }
    },
  );

  server.tool(
    "delete_emails",
    "Delete emails permanently. This action cannot be undone. Prefer move_emails to Trash mailbox for safer deletion — use this only when permanent deletion is explicitly requested.",
    DeleteEmailsSchema.shape,
    async (args: z.infer<typeof DeleteEmailsSchema>) => {
      try {
        return textResult(await deleteEmails(connection, args));
      } catch (error) {
        return errorResult("Error deleting emails", error);
      }
    },
  );
}
