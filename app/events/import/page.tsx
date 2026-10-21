import { notFound } from "next/navigation";
import { getEventManagerCandidates } from "@/lib/staff";
import { getVenueSettings } from "@/lib/venueSettings";
import PdfImportWizard from "./PdfImportWizard";

export default async function ImportFromPdfPage() {
  if (!(await getVenueSettings()).iplan_enabled) notFound();
  const managers = await getEventManagerCandidates();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-bold">יצירת אירוע חדש מ&quot;טופס אירוע חתונה&quot; מ-iPlan</h1>
      <PdfImportWizard managers={managers} />
    </div>
  );
}
