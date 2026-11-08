import { ContractImportWizard } from "./ContractImportWizard";
import { NewEventForm } from "./NewEventForm";

// The contract upload reads a scanned PDF through Gemini inside a Server
// Action, which runs under this page's time limit.
export const maxDuration = 60;

export default function NewPrivateEventPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-bold">אירוע פרטי חדש</h1>
      <ContractImportWizard />
      <NewEventForm />
    </div>
  );
}
