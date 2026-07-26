import { createClient } from "@/lib/supabase/server";

// Mirrors the "לפני הפגישה" / "אחרי הפגישה" checklist on the couple-meeting
// guide page (app/couple-meeting/page.tsx) - kept as a plain list here since
// these need to become actual tasks, not just guide text.
export const COUPLE_MEETING_TASK_TITLES = [
  "שליחת דף הנחיות לזוג במייל, עד 3 ימים לפני הפגישה",
  "פתיחת קבוצת וואטסאפ עם הזוג",
  "שליחת הנקודות העיקריות מהפגישה, וכן נקודות להמשך, לקבוצה",
  "הכנת סקיצה ראשונית ב-iPlan (לפי כמות ההתחייבות)",
];

export async function createCoupleMeetingTasks(eventId: string, assigneeId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert(
    COUPLE_MEETING_TASK_TITLES.map((title) => ({
      event_id: eventId,
      title,
      assignee_id: assigneeId,
    })),
  );
  if (error) throw new Error(error.message);
}
