import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseExcelBuffer } from "@/lib/csv-import";
import { guessGuestMapping, mapGuestRows } from "@/lib/guestImport";
import { parseSketchHtml, renderSketchSvg, seatedTotal, sketchDraft, sketchSummary } from "@/lib/iplanSketch";
import { syncLocationsFromSketch } from "@/lib/sketchSync";

// What the extension reads from an event's own iPlan pages besides the event
// data itself: the hall sketch (the day before the event) and the guest list
// (on the day). Both are applied to the event exactly as the manual upload on
// the staffing / guests pages would, and skipped when nothing changed since the
// last time.

const SKETCH_BUCKET = "event-sketches";

export interface FileResult {
  action: "applied" | "unchanged" | "skipped";
  detail: string;
  change?: { label: string; from: string | null; to: string | null };
}

function hashOf(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

export async function applyIplanSketch(
  supabase: SupabaseClient,
  eventId: string,
  html: string,
  dry: boolean,
): Promise<FileResult> {
  const sketch = parseSketchHtml(html);
  const draft = sketchDraft(sketch);
  if (draft.tables.length === 0 && draft.foodStands.length === 0) {
    return { action: "skipped", detail: "לא נמצאו שולחנות או עמדות בסקיצה" };
  }
  const summary = sketchSummary(draft);
  const hash = hashOf(sketch);

  const { data: event } = await supabase
    .from("events")
    .select("table_sketch_path, iplan_sketch_hash")
    .eq("id", eventId)
    .single<{ table_sketch_path: string | null; iplan_sketch_hash: string | null }>();
  if (!event) return { action: "skipped", detail: "האירוע לא נמצא" };

  const now = new Date().toISOString();
  if (event.iplan_sketch_hash === hash && event.table_sketch_path) {
    if (!dry) await supabase.from("events").update({ iplan_sketch_synced_at: now }).eq("id", eventId);
    return { action: "unchanged", detail: summary };
  }
  if (dry) return { action: "applied", detail: summary };

  const path = `${eventId}/sketch-${Date.now()}.svg`;
  const { error: uploadError } = await supabase.storage
    .from(SKETCH_BUCKET)
    .upload(path, Buffer.from(renderSketchSvg(sketch), "utf-8"), { contentType: "image/svg+xml" });
  if (uploadError) return { action: "skipped", detail: `העלאת הסקיצה נכשלה: ${uploadError.message}` };

  const synced = await syncLocationsFromSketch(supabase, eventId, draft);
  const seated = seatedTotal(draft);
  const { error } = await supabase
    .from("events")
    .update({
      table_sketch_path: path,
      // The number of seated chairs is only meaningful once guests are seated.
      ...(seated > 0 ? { sketch_seated_chairs_count: String(seated) } : {}),
      iplan_sketch_hash: hash,
      iplan_sketch_synced_at: now,
    })
    .eq("id", eventId);
  if (error) {
    await supabase.storage.from(SKETCH_BUCKET).remove([path]);
    return { action: "skipped", detail: error.message };
  }
  if (event.table_sketch_path) await supabase.storage.from(SKETCH_BUCKET).remove([event.table_sketch_path]);

  const parts: string[] = [];
  if (synced.added > 0) parts.push(`${synced.added} נוספו`);
  if (synced.updated > 0) parts.push(`${synced.updated} עודכנו`);
  if (synced.removed > 0) parts.push(`${synced.removed} הוסרו`);
  return {
    action: "applied",
    detail: summary,
    change: { label: "סקיצה", from: null, to: parts.length > 0 ? `${summary} (${parts.join(", ")})` : summary },
  };
}

const GUEST_INSERT_CHUNK = 500;

export async function applyIplanGuests(
  supabase: SupabaseClient,
  eventId: string,
  fileBase64: string,
  dry: boolean,
): Promise<FileResult> {
  const parsed = parseExcelBuffer(Buffer.from(fileBase64, "base64"));
  const mapping = guessGuestMapping(parsed.headers);
  if (!mapping.name) return { action: "skipped", detail: "לא זוהתה עמודת שם בקובץ ההזמנות" };

  const guests = mapGuestRows(parsed.rows, mapping as { name: string; party_size?: string; seating_table?: string });
  if (guests.length === 0) return { action: "skipped", detail: "קובץ ההזמנות ריק" };
  const hash = hashOf(guests);
  const total = guests.reduce((sum, guest) => sum + guest.party_size, 0);
  const detail = `${guests.length} הזמנות, ${total} מקומות מושבים`;

  const { data: event } = await supabase
    .from("events")
    .select("iplan_guests_hash")
    .eq("id", eventId)
    .single<{ iplan_guests_hash: string | null }>();
  if (!event) return { action: "skipped", detail: "האירוע לא נמצא" };

  const now = new Date().toISOString();
  if (event.iplan_guests_hash === hash) {
    if (!dry) await supabase.from("events").update({ iplan_guests_synced_at: now }).eq("id", eventId);
    return { action: "unchanged", detail };
  }
  if (dry) return { action: "applied", detail };

  const { count: before } = await supabase.from("guests").select("id", { count: "exact", head: true }).eq("event_id", eventId);

  // Same as the manual import: the file is the venue's latest full guest list,
  // so it replaces what the event has instead of being added on top of it.
  const { error: deleteError } = await supabase.from("guests").delete().eq("event_id", eventId);
  if (deleteError) return { action: "skipped", detail: deleteError.message };
  const rows = guests.map((guest) => ({ ...guest, event_id: eventId }));
  for (let i = 0; i < rows.length; i += GUEST_INSERT_CHUNK) {
    const { error } = await supabase.from("guests").insert(rows.slice(i, i + GUEST_INSERT_CHUNK));
    if (error) return { action: "skipped", detail: error.message };
  }
  await supabase.from("events").update({ iplan_guests_hash: hash, iplan_guests_synced_at: now }).eq("id", eventId);

  return {
    action: "applied",
    detail,
    change: { label: "רשימת אורחים", from: before ? `${before} הזמנות` : null, to: detail },
  };
}
