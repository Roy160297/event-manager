import { createClient } from "@/lib/supabase/server";
import type { StaffRow } from "@/lib/types";
import ImageImportWizard from "./ImageImportWizard";

export default async function ImportFromImagePage() {
  const supabase = await createClient();
  const { data: managers } = await supabase
    .from("staff")
    .select("*, roles!inner(can_be_event_manager)")
    .eq("roles.can_be_event_manager", true)
    .order("name")
    .returns<StaffRow[]>();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-bold">יצירת אירוע חדש מתמונת מסך מ-iPlan</h1>
      <ImageImportWizard managers={managers ?? []} />
    </div>
  );
}
