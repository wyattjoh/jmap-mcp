# JMAP MCP Server

[![JSR](https://jsr.io/badges/@wyattjoh/jmap-mcp)](https://jsr.io/@wyattjoh/jmap-mcp)
[![JSR Score](https://jsr.io/badges/@wyattjoh/jmap-mcp/score)](https://jsr.io/@wyattjoh/jmap-mcp)
[![JSR Scope](https://jsr.io/badges/@wyattjoh)](https://jsr.io/@wyattjoh)

A Model Context Protocol (MCP) server that provides tools for interacting with
JMAP (JSON Meta Application Protocol) email servers. Built with Deno and using
the [@htunnicliff/jmap-jam](https://jsr.io/@htunnicliff/jmap-jam) client
library.

## Features

### Email Management Tools

- **Search Emails**: Search emails with text queries, sender/recipient filters,
  date ranges, and keywords. All filters are AND'd together.
- **Get Emails**: Retrieve specific emails by ID with configurable property
  selection
- **Get Threads**: Retrieve email threads (conversation chains)
- **Mark Emails**: Mark emails as read/unread, flagged/unflagged
- **Move Emails**: Move emails between mailboxes
- **Delete Emails**: Delete emails permanently

### Mailbox Management

- **Get Mailboxes**: List all mailboxes/folders with hierarchy support. Use this
  to find mailbox IDs needed by other tools.

### Incremental Sync

- **Get Email Changes**: Get IDs of emails created, updated, or destroyed since
  a previous state (state-based delta tracking)
- **Get Search Updates**: Get additions/removals within a previous search query
  since its last queryState

### Email Composition

- **Send Email**: Compose and send new emails with support for plain text and
  HTML
- **Reply to Email**: Reply to existing emails with automatic header handling
  and reply-all support

### Key Capabilities

- Full JMAP RFC 8620/8621 compliance via jmap-jam
- Comprehensive input validation with Zod schemas
- Pagination support for all list operations
- State-based incremental sync for efficient polling
- Rich error handling and connection management
- Capability-based tool registration (read-only, submission)
- TypeScript support with strong typing

## Installation

### Claude Code Plugin (Recommended)

Install via the plugin marketplace:

```shell
/plugin marketplace add wyattjoh/claude-code-marketplace
/plugin install jmap-mcp@wyattjoh-marketplace
```

Then configure the required environment variables in your MCP server settings.

### Prerequisites

- [Deno](https://deno.land/) v1.40 or later
- A JMAP-compliant email server (e.g., Cyrus IMAP, Stalwart Mail Server,
  FastMail)
- Valid JMAP authentication credentials

### Setup

Add the following to your agent of choice:

<!-- x-release-please-start-version -->

```json
{
  "mcpServers": {
    "jmap": {
      "type": "stdio",
      "command": "deno",
      "args": [
        "run",
        "--allow-net=api.fastmail.com",
        "--allow-env=JMAP_SESSION_URL,JMAP_BEARER_TOKEN,JMAP_ACCOUNT_ID",
        "jsr:@wyattjoh/jmap-mcp@0.6.2"
      ],
      "env": {
        "JMAP_SESSION_URL": "https://api.fastmail.com/jmap/session",
        "JMAP_BEARER_TOKEN": "YOUR_API_TOKEN"
      }
    }
  }
}
```

<!-- x-release-please-end -->

> Replace `api.fastmail.com` in `--allow-net` with your JMAP server's hostname
> if not using FastMail.

## Usage

### Environment Variables

| Variable            | Required | Description                                                     |
| ------------------- | -------- | --------------------------------------------------------------- |
| `JMAP_SESSION_URL`  | Yes      | JMAP server session URL (usually ends with `/.well-known/jmap`) |
| `JMAP_BEARER_TOKEN` | Yes      | Bearer token for authentication                                 |
| `JMAP_ACCOUNT_ID`   | No       | Account ID (auto-detected if not provided)                      |

### Available Tools

#### `get_mailboxes`

List mailboxes/folders with their IDs, names, and metadata. **Call this first**
to get mailbox IDs needed by `search_emails` (`inMailbox`) and `move_emails`
(`mailboxId`). Common names: Inbox, Drafts, Sent, Trash, Archive, Spam/Junk.

**Parameters:**

- `parentId` (optional): Filter by parent mailbox ID
- `limit` (optional): Max results (1-200, default: 100)
- `position` (optional): Starting position for pagination

#### `search_emails`

Search emails with filters. **All filters are AND'd together.** Returns only
email IDs — use `get_emails` to fetch content. Results include `queryState` for
incremental sync via `get_search_updates`.

**Parameters:**

- `query` (optional): Text search across all fields
- `body` (optional): Search in message body only
- `from` (optional): Filter by sender email address
- `to` (optional): Filter by recipient email address
- `subject` (optional): Filter by subject text
- `inMailbox` (optional): Mailbox ID to search within (get from `get_mailboxes`)
- `hasKeyword` (optional): Filter by keyword (e.g., `$seen`, `$flagged`)
- `notKeyword` (optional): Exclude by keyword (e.g., `$seen`, `$draft`)
- `allInThreadHaveKeyword` (optional): All emails in thread must have keyword
- `someInThreadHaveKeyword` (optional): At least one email in thread must have
  keyword
- `before` (optional): Only emails before date (ISO 8601 datetime)
- `after` (optional): Only emails after date (ISO 8601 datetime)
- `limit` (optional): Max results (1-100, default: 50)
- `position` (optional): Starting position for pagination (default: 0)

#### `get_emails`

Retrieve specific emails by their IDs. Use `properties` to request only what you
need — fetching all properties returns large payloads.

**Parameters:**

- `ids`: Array of email IDs (1-50 IDs)
- `properties` (optional): Specific properties to return. Recommended sets:
  - Summary: `["id", "subject", "from", "to", "receivedAt", "preview"]`
  - Full read:
    `["id", "subject", "from", "to", "cc", "receivedAt", "bodyValues", "textBody", "htmlBody"]`
  - **Note:** To get body content, include `bodyValues` AND
    `textBody`/`htmlBody`

#### `get_threads`

Get email threads by their IDs. Thread IDs come from `get_emails` responses
(`threadId` property). Returns email IDs per thread — use `get_emails` on those
IDs to fetch content.

**Parameters:**

- `ids`: Array of thread IDs (1-20 IDs)

#### `get_email_changes`

Get IDs of emails created, updated, or destroyed since a previous state. Use the
`state` string from a `get_emails` response.

**Parameters:**

- `sinceState`: State string from a previous `get_emails` response
- `maxChanges` (optional): Max changes to return (1-500)
- `fetchEmails` (optional): Auto-fetch full email details for changed IDs
  (default: false)
- `properties` (optional): Properties to fetch when `fetchEmails` is true

#### `get_search_updates`

Get changes within a previous search query since its `queryState`. Must use the
same filter parameters as the original `search_emails` call.

**Parameters:**

- `sinceQueryState`: `queryState` from a previous `search_emails` response
- All filter parameters from `search_emails` (must match original query)
- `maxChanges` (optional): Max changes to return (1-500)

#### `mark_emails`

Mark emails as read/unread or flagged/unflagged.

**Parameters:**

- `ids`: Array of email IDs (1-100 IDs)
- `seen` (optional): Mark as read (`true`) or unread (`false`)
- `flagged` (optional): Mark as flagged (`true`) or unflagged (`false`)

#### `move_emails`

Move emails to a different mailbox. Use `get_mailboxes` to find the target
mailbox ID.

**Parameters:**

- `ids`: Array of email IDs (1-100 IDs)
- `mailboxId`: Target mailbox ID (get from `get_mailboxes`)

#### `delete_emails`

Delete emails permanently (cannot be undone). Prefer moving to Trash via
`move_emails` for recoverable deletion.

**Parameters:**

- `ids`: Array of email IDs (1-100 IDs)

#### `send_email`

Send a new email. Requires either `textBody` or `htmlBody` (or both).

**Parameters:**

- `to`: Array of recipients (`name` optional, `email` required)
- `cc` (optional): Array of CC recipients
- `bcc` (optional): Array of BCC recipients
- `subject`: Email subject
- `textBody` (optional): Plain text body
- `htmlBody` (optional): HTML body
- `identityId` (optional): JMAP identity ID to send from (uses server default if
  omitted)

#### `reply_to_email`

Reply to an existing email. Automatically sets To/CC, Re: subject prefix, and
threading headers (In-Reply-To, References).

**Parameters:**

- `emailId`: ID of email to reply to
- `replyAll` (optional): Include all original recipients (default: false)
- `subject` (optional): Custom reply subject (defaults to `Re: <original>`)
- `textBody` (optional): Plain text body
- `htmlBody` (optional): HTML body
- `identityId` (optional): JMAP identity ID to send from (uses server default if
  omitted)

## JMAP Server Compatibility

This server should work with any JMAP-compliant email server, including:

- [Cyrus IMAP](https://www.cyrusimap.org/) 3.0+
- [Stalwart Mail Server](https://stalw.art/)
- [FastMail](https://www.fastmail.com/) (commercial)
- [Apache James](https://james.apache.org/) (with JMAP support)

## Development

### Running in Development

```bash
just watch          # Run with file watching
just start          # Run without watching
```

### Testing

```bash
just test           # Run all tests
just check          # Format check + lint + type check
just fmt            # Auto-format code
```

## Architecture

The server is built using:

- **[Deno](https://deno.land/)**: Modern JavaScript/TypeScript runtime
- **[@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk)**:
  MCP server framework
- **[jmap-jam](https://jsr.io/@htunnicliff/jmap-jam)**: Lightweight, typed JMAP
  client
- **[Zod](https://zod.dev/)**: Runtime type validation

## Security

- All input is validated using Zod schemas
- Environment variables are used for sensitive configuration
- No secrets are logged or exposed in responses
- Follows JMAP security best practices

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following the functional programming style
4. Test your changes thoroughly
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Projects

- [jmap-jam](https://github.com/htunnicliff/jmap-jam) - JMAP client library
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [JMAP RFC 8620](https://datatracker.ietf.org/doc/html/rfc8620) - JMAP core
  protocol
- [JMAP RFC 8621](https://datatracker.ietf.org/doc/html/rfc8621) - JMAP for Mail
