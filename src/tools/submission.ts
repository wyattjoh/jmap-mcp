import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type JamClient from "jmap-jam";
import type { EmailCreate } from "jmap-rfc-types";

import { formatError, jsonStringify } from "../utils.ts";

export const SendEmailSchema = z.object({
  to: z.array(z.object({
    name: z.string().optional().describe("Display name of the recipient"),
    email: z.string().email().describe("Email address of the recipient"),
  })).min(1).describe("Recipients"),
  cc: z.array(z.object({
    name: z.string().optional().describe("Display name of the CC recipient"),
    email: z.string().email().describe("Email address of the CC recipient"),
  })).optional().describe("CC recipients"),
  bcc: z.array(z.object({
    name: z.string().optional().describe("Display name of the BCC recipient"),
    email: z.string().email().describe("Email address of the BCC recipient"),
  })).optional().describe("BCC recipients"),
  subject: z.string().describe("Email subject"),
  textBody: z.string().optional().describe("Plain text body"),
  htmlBody: z.string().optional().describe("HTML body"),
  identityId: z.string().optional().describe(
    "JMAP Identity ID to send from. If omitted, the server's default identity is used. Most users have a single identity and can leave this empty.",
  ),
});

export const ReplyToEmailSchema = z.object({
  emailId: z.string().describe("Email ID to reply to"),
  replyAll: z.boolean().default(false).describe("Reply to all recipients"),
  subject: z.string().optional().describe(
    "Reply subject (defaults to Re: original)",
  ),
  textBody: z.string().optional().describe("Plain text body"),
  htmlBody: z.string().optional().describe("HTML body"),
  identityId: z.string().optional().describe(
    "JMAP Identity ID to send from. If omitted, the server's default identity is used. Most users have a single identity and can leave this empty.",
  ),
});

export function registerEmailSubmissionTools(
  server: McpServer,
  jam: JamClient,
  accountId: string,
) {
  server.tool(
    "send_email",
    "Send a new email. Requires either textBody or htmlBody (or both). The identityId parameter is optional — if omitted, the server uses the default sending identity.",
    SendEmailSchema.shape,
    async (args: z.infer<typeof SendEmailSchema>) => {
      try {
        if (!args.textBody && !args.htmlBody) {
          throw new Error("Either textBody or htmlBody must be provided");
        }

        const emailData = {
          subject: args.subject,
          from: args.identityId ? [{ email: args.identityId }] : undefined,
          to: args.to,
          cc: args.cc,
          bcc: args.bcc,
          keywords: { "$draft": true },
          bodyValues: {
            ...(args.textBody && {
              text: {
                value: args.textBody,
                isTruncated: false,
                isEncodingProblem: false,
              },
            }),
            ...(args.htmlBody && {
              html: {
                value: args.htmlBody,
                isTruncated: false,
                isEncodingProblem: false,
              },
            }),
          },
          attachments: [],
        } satisfies EmailCreate;

        const [emailResult] = await jam.api.Email.set({
          accountId,
          create: {
            "draft1": emailData,
          },
        });

        if (!emailResult.created?.draft1) {
          throw new Error("Failed to create email draft");
        }

        const [submissionResult] = await jam.api.EmailSubmission.set({
          accountId,
          create: {
            "submission1": {
              emailId: emailResult.created.draft1.id,
              identityId: args.identityId,
            },
          },
        });

        return {
          content: [
            {
              type: "text",
              text: jsonStringify({
                emailId: emailResult.created.draft1.id,
                submissionId: submissionResult.created?.submission1?.id,
                sent: !!submissionResult.created?.submission1,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error sending email: ${formatError(error)}`,
            },
          ],
        };
      }
    },
  );

  server.tool(
    "reply_to_email",
    "Reply to an existing email. Automatically sets correct To/CC, subject (Re: prefix), and threading headers (In-Reply-To, References). Use replyAll=true to include all original recipients. The identityId parameter is optional — if omitted, the server uses the default sending identity.",
    ReplyToEmailSchema.shape,
    async (args: z.infer<typeof ReplyToEmailSchema>) => {
      try {
        if (!args.textBody && !args.htmlBody) {
          throw new Error("Either textBody or htmlBody must be provided");
        }

        const [originalEmail] = await jam.api.Email.get({
          accountId,
          ids: [args.emailId],
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

        const original = originalEmail.list[0];
        if (!original) {
          throw new Error("Original email not found");
        }

        const replyTo = original.replyTo && original.replyTo.length > 0
          ? original.replyTo
          : original.from;
        const to = replyTo || [];
        const cc: Array<{ name?: string; email: string }> = [];

        let finalCc = cc;
        if (args.replyAll) {
          if (original.to) {
            finalCc = [...(finalCc || []), ...original.to];
          }
          if (original.cc) {
            finalCc = [...(finalCc || []), ...original.cc];
          }
        }

        const replySubject = args.subject ||
          (original.subject?.startsWith("Re: ")
            ? original.subject
            : `Re: ${original.subject}`);

        const emailData = {
          subject: replySubject,
          from: args.identityId ? [{ email: args.identityId }] : undefined,
          to,
          cc: finalCc,
          keywords: { "$draft": true },
          attachments: [],
          inReplyTo: [original.id],
          references: original.references
            ? (Array.isArray(original.references)
              ? [...original.references, original.id]
              : [original.id])
            : [original.id],
          bodyValues: {
            ...(args.textBody &&
              {
                text: {
                  value: args.textBody,
                  isTruncated: false,
                  isEncodingProblem: false,
                },
              }),
            ...(args.htmlBody &&
              {
                html: {
                  value: args.htmlBody,
                  isTruncated: false,
                  isEncodingProblem: false,
                },
              }),
          },
        };

        const [emailResult] = await jam.api.Email.set({
          accountId,
          create: {
            "reply1": emailData,
          },
        });

        if (!emailResult.created?.reply1) {
          throw new Error("Failed to create reply draft");
        }

        const [submissionResult] = await jam.api.EmailSubmission.set({
          accountId,
          create: {
            "submission1": {
              emailId: emailResult.created.reply1.id,
              identityId: args.identityId,
            },
          },
        });

        return {
          content: [
            {
              type: "text",
              text: jsonStringify({
                emailId: emailResult.created.reply1.id,
                submissionId: submissionResult.created?.submission1?.id,
                sent: !!submissionResult.created?.submission1,
                replyAll: args.replyAll,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error replying to email: ${formatError(error)}`,
            },
          ],
        };
      }
    },
  );
}
