import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY não configurada");
  resend = new Resend(key);
  return resend;
}

export interface SendReportEmailInput {
  to: string;
  subject: string;
  html: string;
  attachment: { filename: string; content: Buffer };
}

export async function sendReportEmail(input: SendReportEmailInput): Promise<void> {
  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "Diagnos <no-reply@rhemadata.com>",
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: [
      {
        filename: input.attachment.filename,
        content: input.attachment.content.toString("base64"),
      },
    ],
  });
}
