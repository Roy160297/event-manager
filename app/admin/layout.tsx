import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth";
import { canWrite } from "@/lib/permissions";
import { AdminNav } from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();
  if (!staff || !canWrite(staff.permissions, "admin")) redirect("/");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">ניהול משתמשים והרשאות</h1>
        <AdminNav />
      </div>
      {children}
    </div>
  );
}
