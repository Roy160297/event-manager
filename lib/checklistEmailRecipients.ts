// Fixed distribution list for the "send all closing checklists" email -
// deliberately not the event's own contact_email/contact_email_2 fields
// (those are the couple's addresses); this always goes to the same small
// group of managers/owners regardless of which event it's for. Kept in its
// own module (no server-only imports) so the client-side review UI can
// display it without pulling nodemailer into the browser bundle.
export const CHECKLIST_EMAIL_TO = [
  "rankuperman@gmail.com",
  "roy1602@gmail.com",
  "Yaron@house7.co.il",
  "Asaf@sheva.co.il",
  "Staff@house7.co.il",
  "chef@house7.co.il",
  "Liran@house7.co.il",
  "snir@house7.co.il",
];
export const CHECKLIST_EMAIL_CC = ["info@house7.co.il", "tamirshkadi@gmail.com", "hila@house7.co.il"];
