import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { GuidePage } from "@/components/GuidePage";
import { getCurrentStaff } from "@/lib/auth";
import { canRead } from "@/lib/permissions";
import { loadGuide } from "@/lib/guides";
import { createClient } from "@/lib/supabase/server";

export default async function EventManagementDexPage() {
  const currentStaff = await getCurrentStaff();
  const canReadDex = !!currentStaff && canRead(currentStaff.permissions, "event_management_dex");

  if (!canReadDex) return <NoPermissionNotice />;

  const guide = await loadGuide(await createClient(), "event_management_dex");
  if (!guide) return <p className="text-foreground/60">המדריך לא נמצא.</p>;

  return <GuidePage guide={guide} />;
}
