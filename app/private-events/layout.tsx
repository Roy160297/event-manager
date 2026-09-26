import { notFound } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth";
import { isPrivateEventsOwner } from "@/lib/privateEvents";

// Gate for the entire /private-events tree. Deliberately a plain identity
// check rather than anything in role_permissions - see lib/privateEvents.ts.
// The mint theme/whole-shell reskin itself lives in components/AppShell.tsx,
// not here - this layout only enforces access.
export default async function PrivateEventsLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();
  if (!isPrivateEventsOwner(staff)) notFound();

  return children;
}
