"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canWrite } from "@/lib/permissions";
import { VENUE_SETTINGS_CACHE_TAG } from "@/lib/venueSettings";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// One address per line (or separated by commas/spaces); blanks and repeats dropped.
function parseEmails(raw: string): { emails: string[]; bad: string[] } {
  const seen = new Set<string>();
  const emails: string[] = [];
  const bad: string[] = [];
  for (const part of raw.split(/[\s,;]+/).map((p) => p.trim()).filter(Boolean)) {
    if (!EMAIL_RE.test(part)) bad.push(part);
    else if (!seen.has(part.toLowerCase())) {
      seen.add(part.toLowerCase());
      emails.push(part);
    }
  }
  return { emails, bad };
}

// Returns an error message instead of throwing: Next.js hides thrown Server
// Action messages in production, so only a returned string reaches the user.
export async function saveVenueSettings(formData: FormData): Promise<string | void> {
  const staff = await getCurrentStaff();
  if (!staff || !canWrite(staff.permissions, "venue_settings")) return "אין הרשאה לשנות את הגדרות האולם";

  const text = (field: string) => String(formData.get(field) ?? "").trim();

  const venueName = text("venue_name");
  if (!venueName) return "שם האולם הוא שדה חובה";
  const calendarName = text("calendar_name");
  if (!calendarName) return "שם היומן הוא שדה חובה";

  const to = parseEmails(text("checklist_email_to"));
  const cc = parseEmails(text("checklist_email_cc"));
  const bad = [...to.bad, ...cc.bad];
  if (bad.length > 0) return `כתובות מייל לא תקינות: ${bad.join(", ")}`;

  const supabase = await createClient();
  const { error } = await supabase
    .from("venue_settings")
    .update({
      venue_name: venueName,
      calendar_name: calendarName,
      checklist_email_to: to.emails,
      checklist_email_cc: cc.emails,
      welcome_email_subject: text("welcome_email_subject"),
      // Not trimmed: the template's own blank lines and line breaks are intentional.
      welcome_email_body: String(formData.get("welcome_email_body") ?? "").replace(/\r\n/g, "\n"),
      welcome_email_attachment_filename: text("welcome_email_attachment_filename"),
      iplan_enabled: formData.get("iplan_enabled") === "on",
      default_additional_info: String(formData.get("default_additional_info") ?? "").replace(/\r\n/g, "\n").trim(),
    })
    .eq("id", true);
  if (error) return error.message;

  updateTag(VENUE_SETTINGS_CACHE_TAG);
  revalidatePath("/", "layout");
}
