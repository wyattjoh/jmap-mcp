import { assertEquals, assertRejects } from "@std/assert";
import {
  getEmails,
  type JmapConnection,
  markEmails,
  patchEmailMailboxes,
  replyToEmail,
  searchEmails,
  sendEmail,
} from "../mod.ts";

const createConnection = (
  overrides: Record<string, unknown> = {},
): JmapConnection => ({
  accountId: "account-1",
  isReadOnly: false,
  capabilities: {},
  client: {
    api: {
      Email: {
        query: overrides.emailQuery ?? (() =>
          Promise.resolve([{
            ids: ["email-1"],
            total: 3,
            position: 1,
            queryState: "query-state",
            canCalculateChanges: true,
          }])),
        get: overrides.emailGet ?? (() =>
          Promise.resolve([{
            list: [{ id: "email-1" }],
            notFound: [],
            state: "email-state",
          }])),
        set: overrides.emailSet ?? (() =>
          Promise.resolve([{
            updated: { "email-1": null },
            notUpdated: null,
          }])),
      },
      EmailSubmission: {
        set: overrides.submissionSet ?? (() =>
          Promise.resolve([{
            created: { submission1: { id: "submission-1" } },
          }])),
      },
    },
  },
} as unknown as JmapConnection);

Deno.test("searchEmails returns stable pagination metadata", async () => {
  const result = await searchEmails(createConnection(), {
    filter: { inMailbox: "inbox" },
    limit: 1,
    position: 1,
  });

  assertEquals(result, {
    ids: ["email-1"],
    total: 3,
    position: 1,
    nextPosition: 2,
    hasMore: true,
    queryState: "query-state",
    canCalculateChanges: true,
  });
});

Deno.test("getEmails requests only selected body values", async () => {
  let captured: unknown;
  const connection = createConnection({
    emailGet: (args: unknown) => {
      captured = args;
      return Promise.resolve([{
        list: [{ id: "email-1" }],
        notFound: [],
        state: "email-state",
      }]);
    },
  });

  await getEmails(connection, {
    ids: ["email-1"],
    properties: ["id", "bodyValues", "textBody"],
  });

  assertEquals(captured, {
    accountId: "account-1",
    ids: ["email-1"],
    properties: ["id", "bodyValues", "textBody"],
    fetchTextBodyValues: true,
    fetchHTMLBodyValues: false,
  });
});

Deno.test("markEmails patches keywords without replacing the keyword set", async () => {
  let captured: unknown;
  const connection = createConnection({
    emailSet: (args: unknown) => {
      captured = args;
      return Promise.resolve([{
        updated: { "email-1": null },
        notUpdated: null,
      }]);
    },
  });

  await markEmails(connection, {
    ids: ["email-1"],
    seen: true,
    flagged: false,
  });

  assertEquals(captured, {
    accountId: "account-1",
    update: {
      "email-1": {
        "keywords/$seen": true,
        "keywords/$flagged": null,
      },
    },
  });
});

Deno.test("patchEmailMailboxes escapes mailbox IDs and rejects conflicts", async () => {
  let captured: unknown;
  const connection = createConnection({
    emailSet: (args: unknown) => {
      captured = args;
      return Promise.resolve([{
        updated: { "email-1": null },
        notUpdated: null,
      }]);
    },
  });

  await patchEmailMailboxes(connection, {
    ids: ["email-1"],
    addMailboxIds: ["folder/a~b"],
    removeMailboxIds: ["inbox"],
  });

  assertEquals(captured, {
    accountId: "account-1",
    update: {
      "email-1": {
        "mailboxIds/folder~1a~0b": true,
        "mailboxIds/inbox": null,
      },
    },
  });

  await assertRejects(
    () =>
      patchEmailMailboxes(connection, {
        ids: ["email-1"],
        addMailboxIds: ["same"],
        removeMailboxIds: ["same"],
      }),
    Error,
    "Mailbox cannot be both added and removed",
  );
});

Deno.test("sendEmail creates and submits a draft", async () => {
  const calls: unknown[] = [];
  const connection = createConnection({
    emailSet: (args: unknown) => {
      calls.push(args);
      return Promise.resolve([{
        created: { draft1: { id: "draft-email" } },
      }]);
    },
    submissionSet: (args: unknown) => {
      calls.push(args);
      return Promise.resolve([{
        created: { submission1: { id: "submission-1" } },
      }]);
    },
  });

  const result = await sendEmail(connection, {
    to: [{ email: "recipient@example.test" }],
    cc: undefined,
    bcc: undefined,
    subject: "Hello",
    textBody: "Body",
    htmlBody: undefined,
    identityId: undefined,
  });

  assertEquals(result, {
    emailId: "draft-email",
    submissionId: "submission-1",
    sent: true,
  });
  assertEquals(calls.length, 2);
});

Deno.test("replyToEmail uses reply headers and reply-all recipients", async () => {
  let createdEmail: unknown;
  const connection = createConnection({
    emailGet: () =>
      Promise.resolve([{
        list: [{
          id: "original-id",
          subject: "Question",
          from: [{ email: "sender@example.test" }],
          to: [{ email: "me@example.test" }],
          cc: [{ email: "other@example.test" }],
          references: ["earlier-id"],
        }],
        notFound: [],
        state: "email-state",
      }]),
    emailSet: (args: unknown) => {
      createdEmail = args;
      return Promise.resolve([{
        created: { reply1: { id: "reply-email" } },
      }]);
    },
  });

  const result = await replyToEmail(connection, {
    emailId: "original-id",
    replyAll: true,
    subject: undefined,
    textBody: "Reply",
    htmlBody: undefined,
    identityId: undefined,
  });

  assertEquals(result.replyAll, true);
  assertEquals(createdEmail, {
    accountId: "account-1",
    create: {
      reply1: {
        subject: "Re: Question",
        to: [{ email: "sender@example.test" }],
        cc: [
          { email: "me@example.test" },
          { email: "other@example.test" },
        ],
        keywords: { "$draft": true },
        attachments: [],
        inReplyTo: ["original-id"],
        references: ["earlier-id", "original-id"],
        bodyValues: {
          text: {
            value: "Reply",
            isTruncated: false,
            isEncodingProblem: false,
          },
        },
      },
    },
  });
});
