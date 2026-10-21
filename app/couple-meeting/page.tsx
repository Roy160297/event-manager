import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { GuidePage } from "@/components/GuidePage";
import { getCurrentStaff } from "@/lib/auth";
import { canRead } from "@/lib/permissions";
import { loadGuide } from "@/lib/guides";
import { createClient } from "@/lib/supabase/server";

export default async function CoupleMeetingPage() {
  const currentStaff = await getCurrentStaff();
  const canReadCoupleMeeting = !!currentStaff && canRead(currentStaff.permissions, "couple_meeting");

  if (!canReadCoupleMeeting) return <NoPermissionNotice />;

  const guide = await loadGuide(await createClient(), "couple_meeting");
  if (!guide) return <p className="text-foreground/60">המדריך לא נמצא.</p>;

  return <GuidePage guide={guide} />;
}
