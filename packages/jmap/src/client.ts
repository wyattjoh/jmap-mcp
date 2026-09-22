import JamClient from "jmap-jam";
import type {
  Email,
  EmailAddress,
  EmailCreate,
  EmailFilterCondition,
  FilterCondition,
  Mailbox,
  MailboxFilterCondition,
  Session,
  SetError,
  Thread,
} from "jmap-rfc-types";
import type { GetEmailArguments } from "jmap-jam";

/**
 * Connection details for a JMAP server.
 */
export interface JmapConnectionConfig {
  readonly sessionUrl: string;
  readonly bearerToken: string;
  readonly accountId: string | undefined;
}

/**
 * An authenticated JMAP connection with resolved account metadata.
 */
export interface JmapConnection {
  readonly client: JamClient;
  readonly accountId: string;
  readonly isReadOnly: boolean;
  readonly capabilities: Session["capabilities"];
}

/**
 * Pagination and filtering for an email query.
 */
export interface SearchEmailsInput {
  readonly filter: EmailFilterCondition | undefined;
  readonly limit: number;
  readonly position: number;
}

/**
 * Pagination and hierarchy filtering for mailbox retrieval.
 */
export interface GetMailboxesInput {
  readonly parentId: string | undefined;
  readonly limit: number;
  readonly position: number;
}

/**
 * Email properties and IDs to retrieve.
 */
export interface GetEmailsInput {
  readonly ids: readonly string[];
  readonly properties: readonly (keyof Email)[] | undefined;
}

/**
 * Thread IDs to retrieve.
 */
export interface GetThreadsInput {
  readonly ids: readonly string[];
}

/**
 * Incremental email changes to retrieve.
 */
export interface GetEmailChangesInput {
  readonly sinceState: string;
  readonly maxChanges: number | undefined;
  readonly fetchEmails: boolean;
  readonly properties: readonly (keyof Email)[] | undefined;
}

/**
 * Incremental changes to a stable email query.
 */
export interface GetSearchUpdatesInput {
  readonly sinceQueryState: string;
  readonly filter: EmailFilterCondition | undefined;
  readonly maxChanges: number | undefined;
}

/**
 * Keyword changes for a set of emails.
 */
export interface MarkEmailsInput {
  readonly ids: readonly string[];
  readonly seen: boolean | undefined;
  readonly flagged: boolean | undefined;
}

/**
 * A destructive move to one mailbox.
 */
export interface MoveEmailsInput {
  readonly ids: readonly string[];
  readonly mailboxId: string;
}

/**
 * Additive and subtractive mailbox membership changes.
 */
export interface PatchEmailMailboxesInput {
  readonly ids: readonly string[];
  readonly addMailboxIds: readonly string[];
  readonly removeMailboxIds: readonly string[];
}

/**
 * Email IDs to permanently delete.
 */
export interface DeleteEmailsInput {
  readonly ids: readonly string[];
}

/**
 * Fields required to compose and submit a new email.
 */
export interface SendEmailInput {
  readonly to: readonly EmailAddress[];
  readonly cc: readonly EmailAddress[] | undefined;
  readonly bcc: readonly EmailAddress[] | undefined;
  readonly subject: string;
  readonly textBody: string | undefined;
  readonly htmlBody: string | undefined;
  readonly identityId: string | undefined;
}

/**
 * Fields required to reply to an existing email.
 */
export interface ReplyToEmailInput {
  readonly emailId: string;
  readonly replyAll: boolean;
  readonly subject: string | undefined;
  readonly textBody: string | undefined;
  readonly htmlBody: string | undefined;
  readonly identityId: string | undefined;
}

/**
 * Result of an email query.
 */
export interface SearchEmailsResult {
  readonly ids: readonly string[];
  readonly total: number | undefined;
  readonly position: number;
  readonly nextPosition: number;
  readonly hasMore: boolean;
  readonly queryState: string;
  readonly canCalculateChanges: boolean;
}

/**
 * Result of paginated mailbox retrieval.
 */
export interface GetMailboxesResult {
  readonly mailboxes: readonly Mailbox[];
  readonly total: number | undefined;
  readonly position: number;
  readonly hasMore: boolean;
}

/**
 * Result of email retrieval.
 */
export interface GetEmailsResult {
  readonly emails: readonly Email[];
  readonly notFound: readonly string[];
  readonly state: string;
}

/**
 * Result of thread retrieval.
 */
export interface GetThreadsResult {
  readonly threads: readonly Thread[];
  readonly notFound: readonly string[];
}

/**
 * Result of incremental email change retrieval.
 */
export interface GetEmailChangesResult {
  readonly oldState: string;
  readonly newState: string;
  readonly hasMoreChanges: boolean;
  readonly created: readonly string[];
  readonly updated: readonly string[];
  readonly destroyed: readonly string[];
  readonly emails: readonly Email[] | undefined;
}

/**
 * One email added to a prior query result.
 */
export interface AddedEmail {
  readonly id: string;
  readonly index: number;
}

/**
 * Result of incremental query change retrieval.
 */
export interface GetSearchUpdatesResult {
  readonly oldQueryState: string;
  readonly newQueryState: string;
  readonly added: readonly AddedEmail[];
  readonly removed: readonly string[];
  readonly total: number | undefined;
}

/**
 * Result of an email update operation.
 */
export interface UpdateEmailsResult {
  readonly updated:
    | Readonly<Record<string, Email | null | undefined>>
    | null;
  readonly notUpdated:
    | Readonly<Record<string, SetError | undefined>>
    | null;
}

/**
 * Result of permanent email deletion.
 */
export interface DeleteEmailsResult {
  readonly destroyed: readonly string[] | null;
  readonly notDestroyed:
    | Readonly<Record<string, SetError | undefined>>
    | null;
}

/**
 * Result of creating and submitting an email.
 */
export interface SendEmailResult {
  readonly emailId: string;
  readonly submissionId: string | undefined;
  readonly sent: boolean;
}

/**
 * Result of creating and submitting a reply.
 */
export interface ReplyToEmailResult extends SendEmailResult {
  readonly replyAll: boolean;
}

/**
 * Creates an authenticated JMAP connection and resolves its mail account.
 *
 * @param config JMAP session URL, bearer token, and optional account override.
 * @returns The connected client and resolved account capabilities.
 */
export async function connectJmap(
  config: JmapConnectionConfig,
): Promise<JmapConnection> {
  const client = new JamClient({
    sessionUrl: config.sessionUrl,
    bearerToken: config.bearerToken,
  });
  const session = await client.session;
  const accountId = config.accountId ?? await client.getPrimaryAccount();
  const account = session.accounts[accountId];

  if (!account) {
    throw new Error(`JMAP account not found: ${accountId}`);
  }

  return {
    client,
    accountId,
    isReadOnly: account.isReadOnly,
    capabilities: session.capabilities,
  };
}

/**
 * Searches email IDs in newest-first order.
 *
 * @param connection Authenticated JMAP connection.
 * @param input Query filter and pagination.
 * @returns Matching IDs and incremental query state.
 */
export async function searchEmails(
  connection: JmapConnection,
  input: SearchEmailsInput,
): Promise<SearchEmailsResult> {
  const [result] = await connection.client.api.Email.query({
    accountId: connection.accountId,
    ...(input.filter && { filter: input.filter }),
    limit: input.limit,
    position: input.position,
    calculateTotal: true,
    sort: [{ property: "receivedAt", isAscending: false }],
  });

  return {
    ids: result.ids,
    total: result.total,
    position: result.position,
    nextPosition: result.position + result.ids.length,
    hasMore: result.position + result.ids.length < (result.total ?? 0),
    queryState: result.queryState,
    canCalculateChanges: result.canCalculateChanges,
  };
}

/**
 * Retrieves mailboxes in stable tree order.
 *
 * @param connection Authenticated JMAP connection.
 * @param input Parent filter and pagination.
 * @returns Mailboxes and pagination metadata.
 */
export async function getMailboxes(
  connection: JmapConnection,
  input: GetMailboxesInput,
): Promise<GetMailboxesResult> {
  const filter: FilterCondition<MailboxFilterCondition> | undefined =
    input.parentId ? { parentId: input.parentId } : undefined;
  const [queryResult] = await connection.client.api.Mailbox.query({
    accountId: connection.accountId,
    ...(filter && { filter }),
    limit: input.limit,
    position: input.position,
    calculateTotal: true,
    sort: [{ property: "sortOrder", isAscending: true }],
  });
  const [getResult] = await connection.client.api.Mailbox.get({
    accountId: connection.accountId,
    ids: queryResult.ids,
  });

  return {
    mailboxes: getResult.list,
    total: queryResult.total,
    position: queryResult.position,
    hasMore:
      queryResult.position + queryResult.ids.length < (queryResult.total ?? 0),
  };
}

/**
 * Retrieves emails and automatically requests selected body values.
 *
 * @param connection Authenticated JMAP connection.
 * @param input Email IDs and properties.
 * @returns Emails, missing IDs, and current email state.
 */
export async function getEmails(
  connection: JmapConnection,
  input: GetEmailsInput,
): Promise<GetEmailsResult> {
  const properties = input.properties ? [...input.properties] : undefined;
  const wantsBody = !properties || properties.includes("bodyValues");
  const [result] = await connection.client.api.Email.get(
    {
      accountId: connection.accountId,
      ids: [...input.ids],
      ...(properties && { properties }),
      fetchTextBodyValues: wantsBody &&
        (!properties || properties.includes("textBody")),
      fetchHTMLBodyValues: wantsBody &&
        (!properties || properties.includes("htmlBody")),
    } satisfies GetEmailArguments,
  );

  return {
    emails: result.list as readonly Email[],
    notFound: result.notFound,
    state: result.state,
  };
}

/**
 * Retrieves thread membership by thread ID.
 *
 * @param connection Authenticated JMAP connection.
 * @param input Thread IDs.
 * @returns Threads and missing IDs.
 */
export async function getThreads(
  connection: JmapConnection,
  input: GetThreadsInput,
): Promise<GetThreadsResult> {
  const [result] = await connection.client.api.Thread.get({
    accountId: connection.accountId,
    ids: [...input.ids],
  });

  return { threads: result.list, notFound: result.notFound };
}

/**
 * Retrieves email changes and optionally fetches changed email content.
 *
 * @param connection Authenticated JMAP connection.
 * @param input Incremental state and optional fetch settings.
 * @returns Change IDs, new state, and optionally fetched emails.
 */
export async function getEmailChanges(
  connection: JmapConnection,
  input: GetEmailChangesInput,
): Promise<GetEmailChangesResult> {
  const [changes] = await connection.client.api.Email.changes({
    accountId: connection.accountId,
    sinceState: input.sinceState,
    ...(input.maxChanges !== undefined && { maxChanges: input.maxChanges }),
  });
  const changedIds = [...changes.created, ...changes.updated];
  const fetched = input.fetchEmails && changedIds.length > 0
    ? await getEmails(connection, {
      ids: changedIds,
      properties: input.properties,
    })
    : undefined;

  return {
    oldState: changes.oldState,
    newState: changes.newState,
    hasMoreChanges: changes.hasMoreChanges,
    created: changes.created,
    updated: changes.updated,
    destroyed: changes.destroyed,
    emails: fetched?.emails,
  };
}

/**
 * Retrieves changes to a previous email query.
 *
 * @param connection Authenticated JMAP connection.
 * @param input Prior query state and its original filter.
 * @returns Added and removed IDs plus the new query state.
 */
export async function getSearchUpdates(
  connection: JmapConnection,
  input: GetSearchUpdatesInput,
): Promise<GetSearchUpdatesResult> {
  const [result] = await connection.client.api.Email.queryChanges({
    accountId: connection.accountId,
    sinceQueryState: input.sinceQueryState,
    ...(input.filter && { filter: input.filter }),
    sort: [{ property: "receivedAt", isAscending: false }],
    ...(input.maxChanges !== undefined && { maxChanges: input.maxChanges }),
  });

  return {
    oldQueryState: result.oldQueryState,
    newQueryState: result.newQueryState,
    added: result.added,
    removed: result.removed,
    total: result.total,
  };
}

const escapeJsonPointerSegment = (segment: string): string =>
  segment.replaceAll("~", "~0").replaceAll("/", "~1");

/**
 * Updates read and flagged keywords without replacing unrelated keywords.
 *
 * @param connection Authenticated JMAP connection.
 * @param input Email IDs and keyword values.
 * @returns Updated and rejected IDs.
 */
export async function markEmails(
  connection: JmapConnection,
  input: MarkEmailsInput,
): Promise<UpdateEmailsResult> {
  if (input.seen === undefined && input.flagged === undefined) {
    throw new Error("At least one keyword change must be provided");
  }

  const patch = {
    ...(input.seen !== undefined && {
      "keywords/$seen": input.seen ? true : null,
    }),
    ...(input.flagged !== undefined && {
      "keywords/$flagged": input.flagged ? true : null,
    }),
  };
  const update = Object.fromEntries(
    input.ids.map((id) => [id, patch]),
  );
  const [result] = await connection.client.api.Email.set({
    accountId: connection.accountId,
    update,
  });

  return {
    updated: result.updated as UpdateEmailsResult["updated"],
    notUpdated: result.notUpdated,
  };
}

/**
 * Replaces each email's mailbox membership with one target mailbox.
 *
 * @param connection Authenticated JMAP connection.
 * @param input Email IDs and target mailbox.
 * @returns Updated and rejected IDs.
 */
export async function moveEmails(
  connection: JmapConnection,
  input: MoveEmailsInput,
): Promise<UpdateEmailsResult> {
  const update = Object.fromEntries(
    input.ids.map((id) => [id, { mailboxIds: { [input.mailboxId]: true } }]),
  );
  const [result] = await connection.client.api.Email.set({
    accountId: connection.accountId,
    update,
  });

  return {
    updated: result.updated as UpdateEmailsResult["updated"],
    notUpdated: result.notUpdated,
  };
}

/**
 * Adds and removes mailbox memberships without replacing unspecified mailboxes.
 *
 * @param connection Authenticated JMAP connection.
 * @param input Email IDs and mailbox membership changes.
 * @returns Updated and rejected IDs.
 */
export async function patchEmailMailboxes(
  connection: JmapConnection,
  input: PatchEmailMailboxesInput,
): Promise<UpdateEmailsResult> {
  if (
    input.addMailboxIds.length === 0 && input.removeMailboxIds.length === 0
  ) {
    throw new Error("At least one mailbox change must be provided");
  }

  const additions = new Set(input.addMailboxIds);
  const conflict = input.removeMailboxIds.find((id) => additions.has(id));
  if (conflict) {
    throw new Error(`Mailbox cannot be both added and removed: ${conflict}`);
  }

  const patch = {
    ...Object.fromEntries(
      input.addMailboxIds.map((id) => [
        `mailboxIds/${escapeJsonPointerSegment(id)}`,
        true,
      ]),
    ),
    ...Object.fromEntries(
      input.removeMailboxIds.map((id) => [
        `mailboxIds/${escapeJsonPointerSegment(id)}`,
        null,
      ]),
    ),
  };
  const update = Object.fromEntries(
    input.ids.map((id) => [id, patch]),
  );
  const [result] = await connection.client.api.Email.set({
    accountId: connection.accountId,
    update,
  });

  return {
    updated: result.updated as UpdateEmailsResult["updated"],
    notUpdated: result.notUpdated,
  };
}

/**
 * Permanently deletes emails.
 *
 * @param connection Authenticated JMAP connection.
 * @param input Email IDs to delete.
 * @returns Deleted and rejected IDs.
 */
export async function deleteEmails(
  connection: JmapConnection,
  input: DeleteEmailsInput,
): Promise<DeleteEmailsResult> {
  const [result] = await connection.client.api.Email.set({
    accountId: connection.accountId,
    destroy: [...input.ids],
  });

  return { destroyed: result.destroyed, notDestroyed: result.notDestroyed };
}

const createBodyValues = (
  textBody: string | undefined,
  htmlBody: string | undefined,
) => ({
  ...(textBody && {
    text: {
      value: textBody,
      isTruncated: false,
      isEncodingProblem: false,
    },
  }),
  ...(htmlBody && {
    html: {
      value: htmlBody,
      isTruncated: false,
      isEncodingProblem: false,
    },
  }),
});

async function submitDraft(
  connection: JmapConnection,
  creationId: string,
  submissionCreationId: string,
  emailData: EmailCreate,
  identityId: string | undefined,
): Promise<SendEmailResult> {
  const [emailResult] = await connection.client.api.Email.set({
    accountId: connection.accountId,
    create: { [creationId]: emailData },
  });
  const created = emailResult.created?.[creationId];
  if (!created) throw new Error("Failed to create email draft");

  const [submissionResult] = await connection.client.api.EmailSubmission.set({
    accountId: connection.accountId,
    create: {
      [submissionCreationId]: {
        emailId: created.id,
        ...(identityId !== undefined && { identityId }),
      },
    },
  });
  const submission = submissionResult.created?.[submissionCreationId];

  return {
    emailId: created.id,
    submissionId: submission?.id,
    sent: !!submission,
  };
}

/**
 * Creates and submits a new email.
 *
 * @param connection Authenticated JMAP connection.
 * @param input Message recipients and content.
 * @returns Created email and submission identifiers.
 */
export function sendEmail(
  connection: JmapConnection,
  input: SendEmailInput,
): Promise<SendEmailResult> {
  if (!input.textBody && !input.htmlBody) {
    throw new Error("Either textBody or htmlBody must be provided");
  }

  return submitDraft(
    connection,
    "draft1",
    "submission1",
    {
      subject: input.subject,
      ...(input.identityId && { from: [{ email: input.identityId }] }),
      to: [...input.to],
      ...(input.cc && { cc: [...input.cc] }),
      ...(input.bcc && { bcc: [...input.bcc] }),
      keywords: { "$draft": true },
      bodyValues: createBodyValues(input.textBody, input.htmlBody),
      attachments: [],
    },
    input.identityId,
  );
}

/**
 * Creates and submits a threaded reply.
 *
 * @param connection Authenticated JMAP connection.
 * @param input Original email, recipient behavior, and content.
 * @returns Created email and submission identifiers.
 */
export async function replyToEmail(
  connection: JmapConnection,
  input: ReplyToEmailInput,
): Promise<ReplyToEmailResult> {
  if (!input.textBody && !input.htmlBody) {
    throw new Error("Either textBody or htmlBody must be provided");
  }

  const [originalResult] = await connection.client.api.Email.get({
    accountId: connection.accountId,
    ids: [input.emailId],
    properties: [
      "id",
      "subject",
      "from",
      "to",
      "cc",
      "replyTo",
      "inReplyTo",
      "references",
    ],
  });
  const original = originalResult.list[0];
  if (!original) throw new Error("Original email not found");

  const to = original.replyTo?.length ? original.replyTo : original.from ?? [];
  const cc = input.replyAll
    ? [...(original.to ?? []), ...(original.cc ?? [])]
    : [];
  const subject = input.subject ??
    (original.subject?.startsWith("Re: ")
      ? original.subject
      : `Re: ${original.subject}`);
  const result = await submitDraft(
    connection,
    "reply1",
    "submission1",
    {
      subject,
      ...(input.identityId && { from: [{ email: input.identityId }] }),
      to,
      cc,
      keywords: { "$draft": true },
      attachments: [],
      inReplyTo: [original.id],
      references: original.references
        ? [...original.references, original.id]
        : [original.id],
      bodyValues: createBodyValues(input.textBody, input.htmlBody),
    },
    input.identityId,
  );

  return { ...result, replyAll: input.replyAll };
}

export type { Email, EmailAddress, Mailbox, Thread };
