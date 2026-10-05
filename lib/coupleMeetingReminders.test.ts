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

  it("shows a dash for empty counts and leaves unknown placeholders alone", () => {
    expect(renderEmailBody("{glat_meal_count} {nope}", event)).toBe("— {nope}");
  });
});

describe("emailRuleRecipients", () => {
  it("combines the extra addresses with the manager and salesperson, without duplicates", () => {
    const rule = { to_event_manager: true, to_salesperson: true, extra_emails: "a@x.com, b@x.com;a@x.com" };
    expect(emailRuleRecipients(rule, "m@x.com", "s@x.com")).toEqual(["a@x.com", "b@x.com", "m@x.com", "s@x.com"]);
  });

  it("skips a missing manager/salesperson email", () => {
    const rule = { to_event_manager: true, to_salesperson: true, extra_emails: null };
    expect(emailRuleRecipients(rule, null, undefined)).toEqual([]);
  });

  it("splits on commas, semicolons and whitespace", () => {
    expect(splitEmails(" a@x.com ,b@x.com; c@x.com ")).toEqual(["a@x.com", "b@x.com", "c@x.com"]);
  });
});
