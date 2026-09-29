"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseCsvBuffer, parseExcelBuffer, type ParsedCsv } from "@/lib/csv-import";
import { mapWaiterRows, type WaiterColumnMapping } from "@/lib/waiterImport";

export async function parseWaitersFile(formData: FormData): Promise<ParsedCsv> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("יש לבחור קובץ");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const isExcel = /\.xlsx?$/i.test(file.name);
  return isExcel ? parseExcelBuffer(buffer) : parseCsvBuffer(buffer);
}

// Skips names already in the pool (trimmed, case-insensitive) instead of
// inserting duplicates - a staff roster file gets re-uploaded periodically
// and mostly overlaps with people already added, one at a time or from an
// earlier file.
export async function importWaiters(
  rows: Record<string, string>[],
  mapping: WaiterColumnMapping,
): Promise<{ added: number; skipped: number }> {
  const supabase = await createClient();

  const mapped = mapWaiterRows(rows, mapping);
  if (mapped.length === 0) {
    throw new Error("לא נמצאו מלצרים תקינים לייבוא — ודאו שהוגדרה עמודת השם");
  }

  const { data: existing } = await supabase.from("waiters").select("name").returns<{ name: string }[]>();
  const existingNames = new Set((existing ?? []).map((w) => w.name.trim().toLowerCase()));

  const seenNames = new Set<string>();
  const toInsert = mapped.filter((waiter) => {
    const key = waiter.name.toLowerCase();
    if (existingNames.has(key) || seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  });

  if (toInsert.length > 0) {
    const { error } = await supabase.from("waiters").insert(toInsert);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/waiters");
  return { added: toInsert.length, skipped: mapped.length - toInsert.length };
}

export async function createWaiter(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name) throw new Error("שם המלצר הוא שדה חובה");

  const { error } = await supabase.from("waiters").insert({ name, phone, notes });
  if (error) throw new Error(error.message);

  revalidatePath("/waiters");
}

export async function updateWaiter(waiterId: string, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name) throw new Error("שם המלצר הוא שדה חובה");

  const { error } = await supabase.from("waiters").update({ name, phone, notes }).eq("id", waiterId);
  if (error) throw new Error(error.message);

  revalidatePath("/waiters");
}

export async function deleteWaiter(waiterId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("waiters").delete().eq("id", waiterId);
  if (error) throw new Error(error.message);
  revalidatePath("/waiters");
}
