import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canRead, canWrite } from "@/lib/permissions";
import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { loadDefaultMenus, type DefaultMenu } from "@/lib/defaultMenus";
import { DefaultMenuManager } from "./DefaultMenuManager";

const EMPTY = (menu_type: DefaultMenu["menu_type"]): DefaultMenu => ({
  menu_type,
  title: null,
  subtitle: null,
  linens_note: null,
  sections: [],
  footer_notes: [],
});

export default async function MenusAdminPage() {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff || !canRead(currentStaff.permissions, "venue_settings")) return <NoPermissionNotice />;
  const canEdit = canWrite(currentStaff.permissions, "venue_settings");

  const saved = await loadDefaultMenus(await createClient());
  const menus = (["buffet", "plated"] as const).map((type) => saved.find((menu) => menu.menu_type === type) ?? EMPTY(type));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground/70">
        תפריטי ברירת המחדל של האולם: מזנונים והגשה. בלשונית &quot;תפריט&quot; של כל אירוע יש כפתור שטוען אותם בלחיצה. אפשר לערוך אותם ידנית,
        או להעלות קובץ Word של תפריט לדוגמה והמערכת תזהה ממנו את הסעיפים והמנות.
      </p>
      <p className="text-xs text-foreground/60">
        התפריטים האלה משמשים גם כדוגמה לפורמט של האולם בעת ייבוא קובץ Word לאירוע מסוים, כדי שהזיהוי האוטומטי יתאים לאופן שבו התפריטים שלכם
        בנויים.
      </p>
      {!canEdit && <p className="text-sm text-foreground/60">אפשר לצפות בתפריטים, אך אין לך הרשאה לערוך אותם.</p>}
      {menus.map((menu) => (
        <DefaultMenuManager key={menu.menu_type} menu={menu} canEdit={canEdit} />
      ))}
    </div>
  );
}
