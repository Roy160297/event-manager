import nodemailer from "nodemailer";
import { getVenueSettings } from "@/lib/venueSettings";

// Separate from lib/checklistEmail.ts because these go out unattended from a
// cron job to whichever staff member the reminder is for, rather than being
// triggered (and reviewed) by a person clicking "send" - simple text only, no
// attachments/CC list to manage.
export async function sendReminderEmail({
  to,
  subject,
  bodyText,
}: {
  to: string;
  subject: string;
  bodyText: string;
}) {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  if (!user || !appPassword) {
    throw new Error("שליחת מייל אינה מוגדרת (חסר GMAIL_USER/GMAIL_APP_PASSWORD)");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: appPassword },
  });

  const { venue_name } = await getVenueSettings();
  await transporter.sendMail({
    from: `"${venue_name}" <${user}>`,
    to,
    subject,
    html: `<div dir="rtl">${bodyText}</div>`,
  });
}
