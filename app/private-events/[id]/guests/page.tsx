import { createClient } from "@/lib/supabase/server";
import GuestCsvImport from "./GuestCsvImport";
import { GuestList } from "./GuestList";
import type { PrivateEventGuestRow } from "@/lib/types";

export default async function PrivateGuestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const { data: guests } = await supabase
    .from("private_event_guests")
    .select("*")
    .eq("event_id", eventId)
    .order("name")
    .returns<PrivateEventGuestRow[]>();

  return (
    <div className="flex flex-col gap-6">
      <GuestCsvImport eventId={eventId} />

      {(!guests || guests.length === 0) && <p className="text-foreground/60">עדיין לא יובאו אורחים לאירוע זה.</p>}

      {guests && guests.length > 0 && <GuestList guests={guests} eventId={eventId} />}
    </div>
  );
}
