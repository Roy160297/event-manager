import nodemailer from "nodemailer";

// Fixed distribution list for the "send all closing checklists" email -
// deliberately not the event's own contact_email/contact_email_2 fields
// (those are the couple's addresses); this always goes to the same small
// group of managers/owners regardless of which event it's for.
const TO = ["rankuperman@gmail.com", "info@house7.co.il", "roy1602@gmail.com"];
const CC = [
  "tamirshkadi@gmail.com",
  "Yaron@house7.co.il",
  "Asaf@sheva.co.il",
  "Staff@house7.co.il",
  "hila@house7.co.il",
  "chef@house7.co.il",
  "Liran@house7.co.il",
  "snir@house7.co.il",
];

export async function sendChecklistsEmail({
  eventLabel,
  attachments,
}: {
  eventLabel: string;
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
  // like Resend.
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: appPassword },
  });

  await transporter.sendMail({
    from: `"House No. Seven" <${user}>`,
    to: TO,
    cc: CC,
    subject: `צ'קליסטים לסגירת אירוע - ${eventLabel}`,
    html: `<div dir="rtl">מצורפים כל צ'קליסטי הסגירה עבור ${eventLabel}.</div>`,
    attachments: attachments.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.base64,
      encoding: "base64",
    })),
  });
}
