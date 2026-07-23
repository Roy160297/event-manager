import nodemailer from "nodemailer";
import { CHECKLIST_EMAIL_TO, CHECKLIST_EMAIL_CC } from "@/lib/checklistEmailRecipients";

export async function sendChecklistsEmail({
  subject,
  bodyText,
  replyTo,
  attachments,
}: {
  subject: string;
  bodyText: string;
  replyTo?: string | null;
  attachments: { filename: string; base64: string }[];
}) {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  if (!user || !appPassword) {
    throw new Error("שליחת מייל אינה מוגדרת (חסר GMAIL_USER/GMAIL_APP_PASSWORD)");
  }

  // Sends through Gmail's own SMTP, authenticated as a real personal Gmail
  // account (via an App Password) - not a transactional API - since the
  // recipient domain isn't one we control and can't verify with a service
  // like Resend. The actual event manager isn't the authenticated sender
  // (that would need a separate App Password per manager), so their address
  // goes on Reply-To instead - replies go straight to them, not to GMAIL_USER.
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: appPassword },
  });

  await transporter.sendMail({
    from: `"House No. Seven" <${user}>`,
    to: CHECKLIST_EMAIL_TO,
    cc: CHECKLIST_EMAIL_CC,
    replyTo: replyTo ?? undefined,
    subject,
    html: `<div dir="rtl">${bodyText}</div>`,
    attachments: attachments.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.base64,
      encoding: "base64",
    })),
  });
}
