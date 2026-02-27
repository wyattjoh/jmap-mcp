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
  date ranges, and keywords
- **Get Emails**: Retrieve specific emails by ID with full details
- **Get Threads**: Retrieve email threads (conversation chains)
- **Mark Emails**: Mark emails as read/unread, flagged/unflagged
- **Move Emails**: Move emails between mailboxes
- **Delete Emails**: Delete emails permanently

### Mailbox Management

- **Get Mailboxes**: List all mailboxes/folders with hierarchy support

### Email Composition

- **Send Email**: Compose and send new emails with support for plain text and
  HTML
- **Reply to Email**: Reply to existing emails with reply-all support

### Key Capabilities

- Full JMAP RFC 8620/8621 compliance via jmap-jam
- Comprehensive input validation with Zod schemas
- Pagination support for all list operations
- Rich error handling and connection management
- Functional programming patterns throughout
- TypeScript support with strong typing

## Installation

### Prerequisites

- [Deno](https://deno.land/) v1.40 or later
- A JMAP-compliant email server (e.g., Cyrus IMAP, Stalwart Mail Server,
  FastMail)
- Valid JMAP authentication credentials

### Setup

Add the following to your agent of choice:

```json
{
  "mcpServers": {
    "fastmail": {
      "type": "stdio",
      "command": "deno",
      "args": [
        "run",
        "--allow-net=api.fastmail.com",
        "--allow-env=JMAP_SESSION_URL,JMAP_BEARER_TOKEN,JMAP_ACCOUNT_ID",
        "jsr:@wyattjoh/jmap-mcp"
      ],
      "env": {
        "JMAP_SESSION_URL": "https://api.fastmail.com/jmap/session",
        "JMAP_BEARER_TOKEN": "API_TOKEN"
      }
    }
  }
}
```

## Usage

### Environment Variables

| Variable            | Required | Description                                                     |
| ------------------- | -------- | --------------------------------------------------------------- |
| `JMAP_SESSION_URL`  | Yes      | JMAP server session URL (usually ends with `/.well-known/jmap`) |
| `JMAP_BEARER_TOKEN` | Yes      | Bearer token for authentication                                 |
| `JMAP_ACCOUNT_ID`   | No       | Account ID (auto-detected if not provided)                      |

### Available Tools

#### `search_emails`

Search for emails with various filters.

**Parameters:**

- `query` (optional): Text search query
- `from` (optional): Filter by sender email address
- `to` (optional): Filter by recipient email address
- `subject` (optional): Filter by subject text
- `inMailbox` (optional): Search within specific mailbox
- `hasKeyword` (optional): Filter by keyword (e.g., '$seen', '$flagged')
- `notKeyword` (optional): Exclude by keyword
- `before` (optional): Only emails before date (ISO datetime)
- `after` (optional): Only emails after date (ISO datetime)
- `limit` (optional): Max results (1-100, default: 50)
- `position` (optional): Starting position for pagination (default: 0)

#### `get_emails`

Retrieve specific emails by their IDs.

**Parameters:**

- `ids`: Array of email IDs (1-50 IDs)
- `properties` (optional): Specific properties to return

#### `get_mailboxes`

Get list of mailboxes/folders.

**Parameters:**

- `parentId` (optional): Filter by parent mailbox
- `limit` (optional): Max results (1-200, default: 100)
- `position` (optional): Starting position for pagination

#### `get_threads`

Get email threads by their IDs.

**Parameters:**

- `ids`: Array of thread IDs (1-20 IDs)

#### `mark_emails`

Mark emails with keywords (read/unread, flagged/unflagged).

**Parameters:**

- `ids`: Array of email IDs (1-100 IDs)
- `seen` (optional): Mark as read (true) or unread (false)
- `flagged` (optional): Mark as flagged (true) or unflagged (false)

#### `move_emails`

Move emails to a different mailbox.

**Parameters:**

- `ids`: Array of email IDs (1-100 IDs)
- `mailboxId`: Target mailbox ID

#### `delete_emails`

Delete emails permanently.

**Parameters:**

- `ids`: Array of email IDs (1-100 IDs)

#### `send_email`

Send a new email.

**Parameters:**

- `to`: Array of recipients with `name` and `email`
- `cc` (optional): Array of CC recipients
- `bcc` (optional): Array of BCC recipients
- `subject`: Email subject
- `textBody` (optional): Plain text body
- `htmlBody` (optional): HTML body
- `identityId` (optional): Identity to send from

#### `reply_to_email`

Reply to an existing email.

**Parameters:**

- `emailId`: ID of email to reply to
- `replyAll` (optional): Reply to all recipients (default: false)
- `subject` (optional): Custom reply subject
- `textBody` (optional): Plain text body
- `htmlBody` (optional): HTML body
- `identityId` (optional): Identity to send from

## JMAP Server Compatibility

This server should work with any JMAP-compliant email server, including:

- [Cyrus IMAP](https://www.cyrusimap.org/) 3.0+
- [Stalwart Mail Server](https://stalw.art/)
- [FastMail](https://www.fastmail.com/) (commercial)
- [Apache James](https://james.apache.org/) (with JMAP support)

## Development

### Running in Development

```bash
deno run --allow-env --allow-net --watch src/mod.ts
```

### Testing

```bash
# Test connection
deno run --allow-env --allow-net src/mod.ts
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
