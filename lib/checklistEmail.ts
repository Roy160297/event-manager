import { Resend } from "resend";

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
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("שליחת מייל אינה מוגדרת (חסר RESEND_API_KEY)");

  const resend = new Resend(apiKey);
  const from = process.env.CHECKLIST_EMAIL_FROM ?? "checklists@house7.co.il";

  const { error } = await resend.emails.send({
    from: `House No. Seven <${from}>`,
    to: TO,
    cc: CC,
    subject: `צ'קליסטים לסגירת אירוע - ${eventLabel}`,
    html: `<div dir="rtl">מצורפים כל צ'קליסטי הסגירה עבור ${eventLabel}.</div>`,
    attachments: attachments.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.base64,
    })),
  });

  if (error) throw new Error(error.message);
}
