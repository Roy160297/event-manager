import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyDefaultSchedule, schedulePushRemindersForStep } from "@/app/events/[id]/timeline/actions";
import { checkRemindersForEvent } from "@/lib/reminderRunner";
import { sendPushToStaff } from "@/lib/pushNotifications";
import { todayInIsrael } from "@/lib/coupleMeetingReminders";
import { formatDate } from "@/lib/labels";
import {
  describeChanges,
  diffSnapshots,
  eventInsertFromSnapshot,
  eventUpdateForChanges,
  isIplanEventPayload,
  mergeSnapshot,
  snapshotFromPayload,
  type FieldChange,
  type IplanSnapshot,
} from "@/lib/iplanSync";

// Receives what the iPlan browser extension read (see /iplan-extension). It
// authenticates with a shared secret, not a user session, so /api is excluded
// from the login proxy (see proxy.ts) - same as the cron route.

type Admin = ReturnType<typeof createAdminClient>;

interface EventRowLite {
  id: string;
  name: string;
  event_date: string;
  manager_id: string | null;
  iplan_data: IplanSnapshot | null;
}

interface ItemResult {
  iplan_event_id: string;
  action: "created" | "updated" | "linked" | "unchanged" | "skipped";
  detail?: string;
}

function tokenMatches(header: string | null): boolean {
  const secret = process.env.IPLAN_SYNC_TOKEN;
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function notifyManager(supabase: Admin, managerId: string | null, eventId: string, title: string, body: string) {
  if (!managerId) return;
  try {
    await sendPushToStaff(managerId, { title, body, url: `/events/${eventId}` });
  } catch (err) {
    console.error("iPlan sync: push to the event manager failed:", err);
  }
}

// Whoever can manage users gets told when the sync stops (e.g. iPlan logged
// the browser out), once per outage rather than on every attempt.
async function notifyAdminsLoginRequired(supabase: Admin) {
  const { data: roles } = await supabase
    .from("role_permissions")
    .select("role_id")
    .eq("resource", "admin")
    .eq("can_write", true);
  const roleIds = (roles ?? []).map((row) => row.role_id as string);
  if (roleIds.length === 0) return;
  const { data: admins } = await supabase.from("staff").select("id").in("role_id", roleIds);
  for (const admin of admins ?? []) {
    try {
      await sendPushToStaff(admin.id as string, {
        title: "סנכרון iPlan נעצר",
        body: "iPlan מבקשת התחברות מחדש בדפדפן שמריץ את הסנכרון. יש להתחבר כדי שהאירועים ימשיכו להתעדכן.",
        url: "/admin/iplan",
      });
    } catch (err) {
      console.error("iPlan sync: push to admin failed:", err);
    }
  }
}

async function logChange(
  supabase: Admin,
  eventId: string | null,
  eventName: string,
  kind: "created" | "updated" | "linked",
  changes: FieldChange[],
) {
  await supabase.from("iplan_sync_log").insert({ event_id: eventId, event_name: eventName, kind, changes });
}

async function processEvent(
  supabase: Admin,
  staff: { id: string; name: string }[],
  today: string,
  item: unknown,
  dry: boolean,
): Promise<ItemResult> {
  if (!isIplanEventPayload(item)) return { iplan_event_id: "?", action: "skipped", detail: "מבנה נתונים לא תקין" };
  const iplanId = item.iplan_event_id;
  if (!item.confirmed) return { iplan_event_id: iplanId, action: "skipped", detail: "אירוע לא סגור ב-iPlan" };

  const incoming = snapshotFromPayload(item);
  if (!incoming.event_date || !/^\d{4}-\d{2}-\d{2}$/.test(incoming.event_date)) {
    return { iplan_event_id: iplanId, action: "skipped", detail: "אין תאריך אירוע" };
  }
  if (incoming.event_date < today) return { iplan_event_id: iplanId, action: "skipped", detail: "אירוע שכבר עבר" };
  if (!incoming.name) return { iplan_event_id: iplanId, action: "skipped", detail: "אין שם לקוח" };

  const { data: linked } = await supabase
    .from("events")
    .select("id, name, event_date, manager_id, iplan_data")
    .eq("iplan_event_id", iplanId)
    .is("deleted_at", null)
    .maybeSingle<EventRowLite>();

  const now = new Date().toISOString();

  if (linked) {
    const previous = linked.iplan_data;
    const snapshot = mergeSnapshot(previous, incoming);
    const changes = diffSnapshots(previous, snapshot);
    if (changes.length === 0) {
      if (!previous) await supabase.from("events").update({ iplan_data: snapshot, iplan_synced_at: now }).eq("id", linked.id);
      return { iplan_event_id: iplanId, action: "unchanged" };
    }

    const { update, warnings } = eventUpdateForChanges(changes, snapshot, staff);
    if (dry) {
      return { iplan_event_id: iplanId, action: "updated", detail: `${linked.name}: ${describeChanges(changes)}` };
    }
    // One event per day: a date change onto a day that already has another
    // event is reported rather than silently creating a clash.
    if (typeof update.event_date === "string") {
      const { data: clash } = await supabase
        .from("events")
        .select("name")
        .eq("event_date", update.event_date)
        .is("deleted_at", null)
        .neq("id", linked.id)
        .limit(1);
      if (clash && clash.length > 0) {
        return { iplan_event_id: iplanId, action: "skipped", detail: `התאריך החדש תפוס באירוע "${clash[0].name}"` };
      }
    }

    const { error } = await supabase
      .from("events")
      .update({ ...update, iplan_data: snapshot, iplan_synced_at: now })
      .eq("id", linked.id);
    if (error) return { iplan_event_id: iplanId, action: "skipped", detail: error.message };

    await logChange(supabase, linked.id, linked.name, "updated", changes);
    await checkRemindersForEvent(linked.id);

    if (typeof update.event_date === "string" && update.event_date !== linked.event_date) {
      const { data: steps } = await supabase.from("timeline_items").select("label, approx_time").eq("event_id", linked.id);
      for (const step of steps ?? []) {
        if (step.approx_time) await schedulePushRemindersForStep(linked.id, step.label, step.approx_time, supabase);
      }
    }
    revalidatePath("/");
    revalidatePath(`/events/${linked.id}`);

    await notifyManager(
      supabase,
      (update.manager_id as string | null | undefined) ?? linked.manager_id,
      linked.id,
      `עודכן מ-iPlan: ${linked.name}`,
      describeChanges(changes),
    );
    return { iplan_event_id: iplanId, action: "updated", detail: [describeChanges(changes), ...warnings].join(" | ") };
  }

  // Not linked yet. An event already created by hand for the same day is
  // adopted rather than duplicated (one event per day) - nothing in it is
  // overwritten, iPlan's values just become the baseline for later changes.
  const { data: sameDay } = await supabase
    .from("events")
    .select("id, name, event_date, manager_id, iplan_data")
    .eq("event_date", incoming.event_date)
    .is("deleted_at", null)
    .is("iplan_event_id", null)
    .limit(1)
    .maybeSingle<EventRowLite>();
  if (sameDay) {
    if (dry) return { iplan_event_id: iplanId, action: "linked", detail: sameDay.name };
    await supabase
      .from("events")
      .update({ iplan_event_id: iplanId, iplan_data: incoming, iplan_synced_at: now })
      .eq("id", sameDay.id);
    await logChange(supabase, sameDay.id, sameDay.name, "linked", []);
    return { iplan_event_id: iplanId, action: "linked", detail: sameDay.name };
  }

  const { data: taken } = await supabase
    .from("events")
    .select("name")
    .eq("event_date", incoming.event_date)
    .is("deleted_at", null)
    .limit(1);
  if (taken && taken.length > 0) {
    return { iplan_event_id: iplanId, action: "skipped", detail: `התאריך תפוס באירוע "${taken[0].name}" שמקושר לאירוע אחר` };
  }

  if (dry) return { iplan_event_id: iplanId, action: "created", detail: `${incoming.name} (${incoming.event_date})` };

  const { data: created, error } = await supabase
    .from("events")
    .insert({ ...eventInsertFromSnapshot(incoming, staff), iplan_event_id: iplanId, iplan_data: incoming, iplan_synced_at: now })
    .select("id, manager_id")
    .single<{ id: string; manager_id: string | null }>();
  if (error || !created) return { iplan_event_id: iplanId, action: "skipped", detail: error?.message ?? "יצירה נכשלה" };

  await applyDefaultSchedule(created.id, incoming.event_type, incoming.event_date, supabase);
  await checkRemindersForEvent(created.id);
  await logChange(supabase, created.id, incoming.name, "created", []);
  revalidatePath("/");

  await notifyManager(
    supabase,
    created.manager_id,
    created.id,
    `אירוע חדש מ-iPlan: ${incoming.name}`,
    `${formatDate(incoming.event_date)} - האירוע נוצר אוטומטית ומחכה לך באתר.`,
  );
  return { iplan_event_id: iplanId, action: "created", detail: incoming.name };
}

export async function POST(request: Request) {
  if (!tokenMatches(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { status?: string; error?: string; events?: unknown[]; dry_run?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "גוף הבקשה אינו JSON תקין" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const dry = body.dry_run === true;
  const status = body.status === "login_required" || body.status === "error" ? body.status : "ok";
  const now = new Date().toISOString();

  const { data: previousStatus } = await supabase
    .from("iplan_sync_status")
    .select("last_status")
    .eq("id", true)
    .maybeSingle<{ last_status: string | null }>();

  const results: ItemResult[] = [];
  if (status === "ok" && Array.isArray(body.events)) {
    const { data: staff } = await supabase.from("staff").select("id, name");
    const today = todayInIsrael();
    for (const item of body.events) {
      try {
        results.push(await processEvent(supabase, staff ?? [], today, item, dry));
      } catch (err) {
        console.error("iPlan sync: event failed:", err);
        results.push({
          iplan_event_id: (item as { iplan_event_id?: string })?.iplan_event_id ?? "?",
          action: "skipped",
          detail: err instanceof Error ? err.message : "שגיאה לא צפויה",
        });
      }
    }
  }

  // A dry run only reports what would happen - nothing is written, including
  // the heartbeat.
  if (dry) return Response.json({ ok: true, dry_run: true, results });

  const counts = results.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.action]: (acc[r.action] ?? 0) + 1 }), {});
  await supabase
    .from("iplan_sync_status")
    .update({
      last_ping_at: now,
      ...(status === "ok" ? { last_ok_at: now } : {}),
      last_status: status,
      last_error: status === "ok" ? null : (body.error ?? null),
      last_summary: { counts, skipped: results.filter((r) => r.action === "skipped").map((r) => `${r.iplan_event_id}: ${r.detail ?? ""}`) },
    })
    .eq("id", true);

  if (status === "login_required" && previousStatus?.last_status !== "login_required") {
    await notifyAdminsLoginRequired(supabase);
  }

  return Response.json({ ok: true, results });
}
