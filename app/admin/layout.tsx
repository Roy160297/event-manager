import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth";
import { canRead } from "@/lib/permissions";
import { AdminNav } from "./AdminNav";
import { getVenueSettings } from "@/lib/venueSettings";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [staff, venue] = await Promise.all([getCurrentStaff(), getVenueSettings()]);
  if (!staff || !canRead(staff.permissions, "admin")) redirect("/");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">ניהול האולם</h1>
        <AdminNav showVenue={canRead(staff.permissions, "venue_settings")} showIplan={venue.iplan_enabled} />
      </div>
      {children}
    </div>
  );
}
