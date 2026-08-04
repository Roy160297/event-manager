import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canRead, canWrite } from "@/lib/permissions";
import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { MenuView } from "./MenuView";
import type { EventMenuRow, EventRow } from "@/lib/types";

export default async function MenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const [{ data: event }, { data: menu }, currentStaff] = await Promise.all([
    supabase.from("events").select("*").eq("id", eventId).returns<EventRow[]>().single(),
    supabase.from("event_menus").select("*").eq("event_id", eventId).returns<EventMenuRow[]>().maybeSingle(),
    getCurrentStaff(),
  ]);

  const canReadMenu = !!currentStaff && canRead(currentStaff.permissions, "menu");
  if (!canReadMenu) return <NoPermissionNotice />;

  const canWriteMenu = !!currentStaff && canWrite(currentStaff.permissions, "menu");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-bold">תפריט</h1>
      {event && <MenuView eventId={eventId} event={event} menu={menu ?? null} canWrite={canWriteMenu} />}
    </div>
  );
}
