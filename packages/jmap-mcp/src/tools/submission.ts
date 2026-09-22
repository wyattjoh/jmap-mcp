import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  type EmailAddress,
  type JmapConnection,
  replyToEmail,
  sendEmail,
} from "@wyattjoh/jmap";
import { z } from "zod";
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

const normalizeAddresses = (
  addresses:
    | readonly { name?: string | undefined; email: string }[]
    | undefined,
): EmailAddress[] | undefined =>
  addresses?.map((address) => ({
    email: address.email,
    ...(address.name !== undefined && { name: address.name }),
  }));

const textResult = (value: unknown) => ({
  content: [{ type: "text" as const, text: jsonStringify(value) }],
});

const errorResult = (prefix: string, error: unknown) => ({
  content: [{
    type: "text" as const,
    text: `${prefix}: ${formatError(error)}`,
  }],
});

/**
 * Registers MCP submission tools backed by the reusable JMAP client package.
 *
 * @param server MCP server receiving tool registrations.
 * @param connection Authenticated writable JMAP connection.
 */
export function registerEmailSubmissionTools(
  server: McpServer,
  connection: JmapConnection,
): void {
  server.tool(
    "send_email",
    "Send a new email. Requires either textBody or htmlBody (or both). The identityId parameter is optional — if omitted, the server uses the default sending identity.",
    SendEmailSchema.shape,
    async (args: z.infer<typeof SendEmailSchema>) => {
      try {
        return textResult(
          await sendEmail(connection, {
            to: normalizeAddresses(args.to) ?? [],
            cc: normalizeAddresses(args.cc),
            bcc: normalizeAddresses(args.bcc),
            subject: args.subject,
            textBody: args.textBody,
            htmlBody: args.htmlBody,
            identityId: args.identityId,
          }),
        );
      } catch (error) {
        return errorResult("Error sending email", error);
      }
    },
  );

  server.tool(
    "reply_to_email",
    "Reply to an existing email. Automatically sets correct To/CC, subject (Re: prefix), and threading headers (In-Reply-To, References). Use replyAll=true to include all original recipients. The identityId parameter is optional — if omitted, the server uses the default sending identity.",
    ReplyToEmailSchema.shape,
    async (args: z.infer<typeof ReplyToEmailSchema>) => {
      try {
        return textResult(
          await replyToEmail(connection, {
            emailId: args.emailId,
            replyAll: args.replyAll,
            subject: args.subject,
            textBody: args.textBody,
            htmlBody: args.htmlBody,
            identityId: args.identityId,
          }),
        );
      } catch (error) {
        return errorResult("Error replying to email", error);
      }
    },
  );
}
