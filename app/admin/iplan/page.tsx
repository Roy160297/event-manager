import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canWrite } from "@/lib/permissions";
import { requestSyncNow, setSyncInterval } from "./actions";

interface StatusRow {
  last_ping_at: string | null;
  last_ok_at: string | null;
  last_status: string | null;
  last_error: string | null;
  last_summary: { counts?: Record<string, number>; skipped?: string[] } | null;
  interval_minutes: number;
  run_requested_at: string | null;
  last_run_at: string | null;
}

const INTERVAL_OPTIONS = [
  { minutes: 60, label: "כל שעה" },
  { minutes: 120, label: "כל שעתיים" },
  { minutes: 180, label: "כל 3 שעות" },
  { minutes: 360, label: "כל 6 שעות" },
  { minutes: 720, label: "כל 12 שעות" },
  { minutes: 1440, label: "פעם ביום, בבוקר" },
];

interface LogRow {
  id: string;
  created_at: string;
  event_id: string | null;
  event_name: string;
  kind: "created" | "updated" | "linked";
  changes: { label: string; from: string | null; to: string | null }[];
}

const KIND_LABELS: Record<LogRow["kind"], string> = {
  created: "אירוע חדש נוצר",
  updated: "עודכן",
  linked: "קושר לאירוע קיים",
};

const ACTION_LABELS: Record<string, string> = {
  created: "נוצרו",
  updated: "עודכנו",
  linked: "קושרו",
  unchanged: "ללא שינוי",
  skipped: "דולגו",
};

const israelTime = new Intl.DateTimeFormat("he-IL", {
  timeZone: "Asia/Jerusalem",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function minutesAgo(iso: string | null): number | null {
  return iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000)) : null;
}

function agoText(minutes: number | null): string {
  if (minutes == null) return "אף פעם";
  if (minutes < 1) return "הרגע";
  if (minutes < 60) return `לפני ${minutes} דקות`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `לפני ${hours} שעות`;
  return `לפני ${Math.round(hours / 24)} ימים`;
}

export default async function IplanSyncPage() {
  const supabase = await createClient();
  const [{ data: status }, { data: log }, currentStaff] = await Promise.all([
    supabase.from("iplan_sync_status").select("*").eq("id", true).maybeSingle<StatusRow>(),
    supabase
      .from("iplan_sync_log")
      .select("id, created_at, event_id, event_name, kind, changes")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<LogRow[]>(),
    getCurrentStaff(),
  ]);
  const canManage = !!currentStaff && canWrite(currentStaff.permissions, "admin");
  const pendingRequest =
    !!status?.run_requested_at && (!status.last_run_at || status.run_requested_at > status.last_run_at);

  const sinceOk = minutesAgo(status?.last_ok_at ?? null);
  const sincePing = minutesAgo(status?.last_ping_at ?? null);
  // The extension reports every ~15 minutes; a long silence means it stopped
  // (computer off or asleep, Chrome closed) even if it never reported a problem.
  const stale = sincePing == null || sincePing > 90;
  const loginNeeded = status?.last_status === "login_required";
  const failing = status?.last_status === "error";

  const tone = loginNeeded || failing || stale ? "border-red-300 bg-red-50 text-red-800" : "border-green-300 bg-green-50 text-green-800";
  const headline = loginNeeded
    ? "iPlan מבקשת התחברות מחדש - הסנכרון עצור"
    : failing
      ? "הסנכרון נתקל בשגיאה"
      : stale
        ? "הסנכרון לא דיווח זמן רב - ייתכן שהמחשב כבוי או ש-Chrome סגור"
        : "הסנכרון פעיל";

  return (
    <div className="flex flex-col gap-6">
      <section className={`flex flex-col gap-1 rounded-lg border p-4 ${tone}`}>
        <p className="font-medium">{headline}</p>
        <p className="text-sm">
          דיווח אחרון: {agoText(sincePing)} · סנכרון תקין אחרון: {agoText(sinceOk)}
        </p>
        {status?.last_error && <p className="text-sm">{status.last_error}</p>}
        {status?.last_summary?.counts && (
          <p className="text-sm">
            בסבב האחרון:{" "}
            {Object.entries(status.last_summary.counts)
              .map(([action, count]) => `${count} ${ACTION_LABELS[action] ?? action}`)
              .join(" · ")}
          </p>
        )}
        {(status?.last_summary?.skipped?.length ?? 0) > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer">אירועים שדולגו ({status?.last_summary?.skipped?.length})</summary>
            <ul className="mt-1 list-disc ps-5">
              {status?.last_summary?.skipped?.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {canManage && (
        <section className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4">
          <form action={setSyncInterval} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span>תדירות הסנכרון (בשעות היום בלבד)</span>
              <select
                name="interval_minutes"
                defaultValue={status?.interval_minutes ?? 180}
                className="rounded-md border border-border-classic bg-surface px-3 py-2"
              >
                {INTERVAL_OPTIONS.map((option) => (
                  <option key={option.minutes} value={option.minutes}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="rounded-full border border-border-classic px-4 py-2 text-sm hover:bg-accent-soft">
              שמור
            </button>
          </form>
          <form action={requestSyncNow} className="flex flex-wrap items-center gap-3">
            <button type="submit" className="rounded-full border border-accent px-4 py-2 text-sm text-accent hover:bg-accent-soft">
              סנכרן עכשיו
            </button>
            <span className="text-sm text-foreground/60">
              {pendingRequest
                ? "הבקשה נרשמה - הסנכרון יתחיל בדקות הקרובות (התוסף בודק אחת ל-15 דקות)."
                : "התוסף בודק אחת ל-15 דקות אם הגיע הזמן; הלחיצה גורמת לו לרוץ בבדיקה הבאה."}
            </span>
          </form>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">מה השתנה לאחרונה</h2>
        <p className="on-photo text-sm">
          אירועים חדשים נוצרים אוטומטית מ-iPlan, ושינויים (למשל בהתחייבות) מתעדכנים באירוע הקיים. שדות שעדכנתם כאן ידנית
          ואינם השתנו ב-iPlan לא נדרסים.
        </p>
        {(log ?? []).length === 0 && <p className="on-photo">עדיין לא בוצע סנכרון.</p>}
        <ul className="flex flex-col gap-2">
          {(log ?? []).map((row) => (
            <li key={row.id} className="rounded-lg border border-border-classic bg-surface p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">
                  {row.event_id ? (
                    <a href={`/events/${row.event_id}`} className="underline-offset-2 hover:underline">
                      {row.event_name}
                    </a>
                  ) : (
                    row.event_name
                  )}
                </p>
                <span className="text-xs text-foreground/60">
                  {KIND_LABELS[row.kind]} · {israelTime.format(new Date(row.created_at))}
                </span>
              </div>
              {row.changes.length > 0 && (
                <ul className="mt-1 text-sm text-foreground/70">
                  {row.changes.map((change) => (
                    <li key={change.label}>
                      {change.label}: {change.from ?? "ריק"} ← {change.to ?? "ריק"}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
