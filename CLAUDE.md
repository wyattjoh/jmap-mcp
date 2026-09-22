# CLAUDE.md

This file provides guidance to coding agents working in this repository.

## Project Overview

This Deno workspace contains a reusable functional JMAP email client and an MCP
server built on top of it. It supports JMAP-compliant servers such as FastMail,
Cyrus IMAP, and Stalwart Mail Server.

## Development Commands

- `deno task start` - Run the MCP server
- `deno task watch` - Run the MCP server with file watching
- `deno task check` - Type-check both workspace packages
- `deno task fmt` - Format code (excluding changelogs)
- `deno fmt --check` - Check formatting
- `deno task lint` - Lint workspace packages
- `deno task test` - Run all tests
- `deno test packages/jmap/tests/client_test.ts` - Run JMAP client tests
- `deno test packages/jmap-mcp/tests/tools/email_test.ts` - Run MCP email tool
  tests
- `deno task publish:check` - Validate both JSR packages

### Pre-commit Hooks

Run `deno task hooks:install` to install hooks. Pre-commit runs type checking,
formatting, and linting. Pre-push validates both JSR packages.

### Required Environment Variables

```bash
JMAP_SESSION_URL="https://your-jmap-server.com/.well-known/jmap"
JMAP_BEARER_TOKEN="your-bearer-token"
JMAP_ACCOUNT_ID="account-id"  # Optional, auto-detected if not provided
```

## Workspace Structure

- `packages/jmap/` - `@wyattjoh/jmap`, the independently publishable functional
  client library
  - `mod.ts` - Public package interface
  - `src/client.ts` - Connection setup and JMAP operations
  - `tests/` - Direct client-interface tests
- `packages/jmap-mcp/` - `@wyattjoh/jmap-mcp`, the MCP adapter and executable
  - `src/mod.ts` - Environment configuration, capability checks, and stdio
    startup
  - `src/tools/email.ts` - Mail retrieval, sync, and mutation tool adapters
  - `src/tools/submission.ts` - Send and reply tool adapters
  - `tests/` - MCP interface tests using `InMemoryTransport`

Both packages are independently publishable. Keep JMAP behavior in
`@wyattjoh/jmap`; MCP files should validate inputs, adapt results to MCP
content, and centralize user-facing tool descriptions without duplicating
protocol operations.

## Architecture

### Functional Client Module

`@wyattjoh/jmap` follows the same pattern as the standalone client packages in
`media-server-mcp`:

- `connectJmap()` creates an authenticated connection and resolves the mail
  account.
- Exported functions accept a `JmapConnection` plus typed input and return typed
  application data.
- `jmap-jam` remains an implementation dependency of the client package.
- Callers never need an MCP server or transport to use JMAP operations.
- Public exports require multi-line JSDoc.

### MCP Adapter Module

The MCP package registers tools conditionally from server capabilities. Tool
handlers call `@wyattjoh/jmap` functions and serialize their results. Keep
existing MCP tool names and input/output behavior backward compatible.

Read-only accounts expose retrieval and incremental-sync tools. Writable
accounts additionally expose keyword, mailbox, and deletion tools. Submission
tools require the JMAP submission capability and a writable account.

### Mailbox and Keyword Mutations

- `moveEmails` and the existing `move_emails` tool intentionally replace mailbox
  membership with one target mailbox.
- `patchEmailMailboxes` and `patch_email_mailboxes` add/remove selected
  memberships while preserving unspecified mailboxes.
- Keyword mutations use JMAP patch paths so changing `$seen` does not remove
  `$flagged` or custom keywords.
- Escape mailbox IDs as JSON Pointer path segments before constructing patch
  keys.

## Development Guidelines

- Follow functional programming patterns; do not introduce classes.
- Keep the public client interface small and place protocol complexity behind
  it.
- All external MCP inputs must be validated with Zod.
- Use types from `jmap-jam` and `jmap-rfc-types` inside the client package.
- Use `formatError()` for MCP-facing error messages.
- Use `console.warn()` for server status messages so stdio remains
  protocol-safe.
- Use explicit `| undefined` properties for structurally complete public types.
- All publicly exported types and functions require multi-line JSDoc.
- Keep README and CLAUDE.md synchronized with changes to commands, tools, or
  structure.

## Testing

Client tests exercise exported `@wyattjoh/jmap` functions through their public
interface with a structural fake connection. MCP tests use `InMemoryTransport`
and verify tool contracts independently of transport I/O. Add behavior tests at
the client seam first, then adapter tests for schemas, registration, or
serialization.

## JMAP Considerations

- Email and thread IDs are server-specific strings, not UUIDs.
- Mailbox hierarchies use `parentId`.
- Keywords such as `$seen`, `$flagged`, and `$draft` control email state.
- Date filters use ISO 8601.
- Pagination uses `position` and `limit`.
- A JMAP PatchObject path has an implicit leading slash; escape `~` as `~0` and
  `/` as `~1` in path segments.

## Security

- Bearer tokens come from environment variables and are never logged.
- Do not expose credentials in MCP responses.
- Preserve capability and read-only checks before registering mutation tools.
- Validate external input before passing it to the client package.
