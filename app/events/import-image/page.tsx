import { getEventManagerCandidates } from "@/lib/staff";
import ImageImportWizard from "./ImageImportWizard";

// The Gemini extraction can chain multiple sequential calls (overload retry,
// model fallback, missing-critical-fields retry) - the platform's default
// function timeout can be shorter than that worst case, which surfaces to
// the user as a generic "unexpected response from the server" error.
export const maxDuration = 60;

export default async function ImportFromImagePage() {
  const managers = await getEventManagerCandidates();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-bold">יצירת אירוע חדש מתמונת מסך מ-iPlan</h1>
      <ImageImportWizard managers={managers} />
    </div>
  );
}
