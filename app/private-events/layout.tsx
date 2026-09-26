import { notFound } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth";
import { isPrivateEventsOwner } from "@/lib/privateEvents";

// Gate for the entire /private-events tree. Deliberately a plain identity
// check rather than anything in role_permissions - see lib/privateEvents.ts.
export default async function PrivateEventsLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();
  if (!isPrivateEventsOwner(staff)) notFound();

  return <div className="theme-private min-h-[80vh] rounded-lg p-4 sm:p-6">{children}</div>;
}
