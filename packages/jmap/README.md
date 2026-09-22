# `@wyattjoh/jmap`

Functional JMAP email client used by
[`@wyattjoh/jmap-mcp`](https://jsr.io/@wyattjoh/jmap-mcp) and standalone Deno
applications.

## Usage

```ts
import { connectJmap, getEmails, searchEmails } from "jsr:@wyattjoh/jmap";

const connection = await connectJmap({
  sessionUrl: Deno.env.get("JMAP_SESSION_URL")!,
  bearerToken: Deno.env.get("JMAP_BEARER_TOKEN")!,
  accountId: Deno.env.get("JMAP_ACCOUNT_ID"),
});

const search = await searchEmails(connection, {
  filter: { inMailbox: "inbox-mailbox-id", notKeyword: "$seen" },
  limit: 50,
  position: 0,
});

const emails = await getEmails(connection, {
  ids: search.ids,
  properties: [
    "id",
    "threadId",
    "from",
    "to",
    "subject",
    "receivedAt",
    "preview",
  ],
});
```

The package exposes typed functional operations for mailbox discovery, email and
thread retrieval, incremental changes, keyword and mailbox mutations, deletion,
sending, and replies. `patchEmailMailboxes` adds or removes memberships without
replacing unspecified mailboxes.

## Development

From the repository root:

```bash
deno task check
deno task test
deno task fmt
deno task lint
```
