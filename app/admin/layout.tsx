import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth";
import { canWrite } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();
  if (!staff || !canWrite(staff.permissions, "admin")) redirect("/");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">ניהול משתמשים והרשאות</h1>
        <nav className="mt-3 flex gap-1 border-b border-border-classic">
          <Link href="/admin/users" className="border-b-2 border-transparent px-3 py-2 text-sm hover:text-accent">
            משתמשים
          </Link>
          <Link href="/admin/roles" className="border-b-2 border-transparent px-3 py-2 text-sm hover:text-accent">
            תפקידים והרשאות
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
