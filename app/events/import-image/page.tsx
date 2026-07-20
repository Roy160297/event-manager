import { createClient } from "@/lib/supabase/server";
import type { StaffRow } from "@/lib/types";
import ImageImportWizard from "./ImageImportWizard";

export default async function ImportFromImagePage() {
  const supabase = await createClient();
  const { data: managers } = await supabase.from("staff").select("*").order("name").returns<StaffRow[]>();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-bold">יצירת אירוע חדש מתמונת מסך מ-iPlan</h1>
      <ImageImportWizard managers={managers ?? []} />
    </div>
  );
}
