import { createClient } from "@/lib/supabase/server";
import GuestCsvImport from "./GuestCsvImport";
import { GuestList } from "./GuestList";
import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { getCurrentStaff } from "@/lib/auth";
import { canRead, canWrite } from "@/lib/permissions";
import type { GuestRow } from "@/lib/types";

export default async function GuestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const [{ data: guests }, currentStaff] = await Promise.all([
    supabase.from("guests").select("*").eq("event_id", eventId).order("name").returns<GuestRow[]>(),
    getCurrentStaff(),
  ]);

  const canReadGuests = !!currentStaff && canRead(currentStaff.permissions, "guests");
  const canWriteGuests = !!currentStaff && canWrite(currentStaff.permissions, "guests");

  if (!canReadGuests) return <NoPermissionNotice />;

  return (
    <div className="flex flex-col gap-6">
      {canWriteGuests && <GuestCsvImport eventId={eventId} />}

      {(!guests || guests.length === 0) && (
        <p className="text-foreground/60">עדיין לא יובאו אורחים לאירוע זה.</p>
      )}

      {guests && guests.length > 0 && (
        <GuestList guests={guests} eventId={eventId} canWrite={canWriteGuests} />
      )}
    </div>
  );
}
