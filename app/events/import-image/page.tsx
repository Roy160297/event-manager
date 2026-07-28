import { getEventManagerCandidates } from "@/lib/staff";
import ImageImportWizard from "./ImageImportWizard";

export default async function ImportFromImagePage() {
  const managers = await getEventManagerCandidates();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-bold">יצירת אירוע חדש מתמונת מסך מ-iPlan</h1>
      <ImageImportWizard managers={managers} />
    </div>
  );
}
