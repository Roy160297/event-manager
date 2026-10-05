import { describe, expect, it } from "vitest";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { addDaysToDate } from "@/lib/coupleMeetingReminders";
import {
  emailRuleRecipients,
  renderEmailBody,
  renderEmailSubject,
  resolveEmailTargetDate,
  splitEmails,
  type EmailReminderEvent,
} from "@/lib/emailReminders";

describe("addDaysToDate", () => {
  it("subtracts days within the same month", () => {
    expect(addDaysToDate("2026-08-10", -3)).toBe("2026-08-07");
  });

  it("adds days within the same month", () => {
    expect(addDaysToDate("2026-08-10", 1)).toBe("2026-08-11");
  });

  it("rolls over a month boundary", () => {
    expect(addDaysToDate("2026-08-01", -1)).toBe("2026-07-31");
  });

  it("rolls over a year boundary", () => {
    expect(addDaysToDate("2026-01-01", -1)).toBe("2025-12-31");
  });
});

const event: EmailReminderEvent = {
  name: "שי קטש וגיל מזרחי",
  event_type: "wedding",
  event_date: "2026-08-14",
  couple_meeting_date: null,
  estimated_guests: "200+14",
  kids_meal_count: "10",
  glat_meal_count: null,
  vegetarian_meal_count: "8",
  vegan_meal_count: "3",
  gluten_free_meal_count: "2",
  toddlers_under_2_count: "1",
  menu_notes: "שורה ראשונה\nשורה <שנייה> & עוד",
};

describe("resolveEmailTargetDate", () => {
  it("offsets from the event date", () => {
    expect(resolveEmailTargetDate({ anchor: "event_date", offset_days: -7, fallback_offset_days: null }, event)).toBe("2026-08-07");
  });

  it("offsets from the couple meeting when there is one", () => {
    const rule = { anchor: "couple_meeting_date" as const, offset_days: 1, fallback_offset_days: -7 };
    expect(resolveEmailTargetDate(rule, { ...event, couple_meeting_date: "2026-07-01" })).toBe("2026-07-02");
  });

  it("falls back to the event date when there is no meeting date, or is skipped without a fallback", () => {
    const withFallback = { anchor: "couple_meeting_date" as const, offset_days: 1, fallback_offset_days: -7 };
    expect(resolveEmailTargetDate(withFallback, event)).toBe("2026-08-07");
    const noFallback = { anchor: "couple_meeting_date" as const, offset_days: 1, fallback_offset_days: null };
    expect(resolveEmailTargetDate(noFallback, event)).toBeNull();
  });
});

describe("rendering", () => {
  it("fills placeholders in the subject as plain text", () => {
    expect(renderEmailSubject("{event_name} - {event_type} - {event_date}", event)).toBe(
      `שי קטש וגיל מזרחי - ${EVENT_TYPE_LABELS.wedding} - 14/08/2026`,
    );
  });

  it("bolds the event name, escapes HTML and keeps line breaks in the body", () => {
    const html = renderEmailBody("אירוע {event_name}:\n{additional_info}", event);
    expect(html).toBe("אירוע <strong>שי קטש וגיל מזרחי</strong>:<br/>שורה ראשונה<br/>שורה &lt;שנייה&gt; &amp; עוד");
  });

  it("adds the event automatically when the text never mentions its name", () => {
    expect(renderEmailSubject("להעלות צ'ילר לחופה", event)).toBe("להעלות צ'ילר לחופה - שי קטש וגיל מזרחי");
    expect(renderEmailBody("להעלות צ'ילר לחופה", event)).toBe(
      "להעלות צ'ילר לחופה<br/><br/>האירוע: <strong>שי קטש וגיל מזרחי</strong> (בתאריך 14/08/2026)",
    );
  });

  it("shows a dash for empty counts and leaves unknown placeholders alone", () => {
    expect(renderEmailBody("{event_name} {glat_meal_count} {nope}", event)).toBe("<strong>שי קטש וגיל מזרחי</strong> — {nope}");
  });
});

describe("emailRuleRecipients", () => {
  const directory = [
    { id: "m", email: "m@x.com", role_id: "r-manager" },
    { id: "f", email: "f@x.com", role_id: "r-floor" },
    { id: "s", email: "s@x.com", role_id: "r-sales" },
    { id: "b", email: "b@x.com", role_id: "r-bar" },
    { id: "nomail", email: null, role_id: "r-bar" },
  ];
  const event = { manager_id: "m", floor_manager_id: "f", sales_person_id: "s" };
  const none = { to_event_manager: false, to_floor_manager: false, to_salesperson: false, recipient_role_ids: [], recipient_staff_ids: [], extra_emails: null };

  it("picks the event's manager, floor manager and salesperson", () => {
    const rule = { ...none, to_event_manager: true, to_floor_manager: true, to_salesperson: true };
    expect(emailRuleRecipients(rule, event, directory)).toEqual(["m@x.com", "f@x.com", "s@x.com"]);
  });

  it("adds everyone in the chosen roles, chosen staff and typed addresses, without duplicates", () => {
    const rule = { ...none, to_event_manager: true, recipient_role_ids: ["r-bar"], recipient_staff_ids: ["m"], extra_emails: "a@x.com, a@x.com" };
    expect(emailRuleRecipients(rule, event, directory)).toEqual(["a@x.com", "m@x.com", "b@x.com"]);
  });

  it("skips people without an email and events without that role assigned", () => {
    const rule = { ...none, to_floor_manager: true, recipient_staff_ids: ["nomail"] };
    expect(emailRuleRecipients(rule, { ...event, floor_manager_id: null }, directory)).toEqual([]);
  });

  it("emails a person once even if reached several ways, ignoring case", () => {
    const rule = { ...none, to_floor_manager: true, recipient_staff_ids: ["f"], extra_emails: "F@X.com" };
    expect(emailRuleRecipients(rule, event, directory)).toEqual(["F@X.com"]);
  });

  it("splits typed addresses on commas, semicolons and whitespace", () => {
    expect(splitEmails(" a@x.com ,b@x.com; c@x.com ")).toEqual(["a@x.com", "b@x.com", "c@x.com"]);
  });
});
