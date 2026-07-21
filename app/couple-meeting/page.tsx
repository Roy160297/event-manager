import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { getCurrentStaff } from "@/lib/auth";
import { canRead } from "@/lib/permissions";

const cardClass = "flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4";
const listClass = "flex flex-col gap-1.5 text-sm";

export default async function CoupleMeetingPage() {
  const currentStaff = await getCurrentStaff();
  const canReadCoupleMeeting = !!currentStaff && canRead(currentStaff.permissions, "couple_meeting");

  if (!canReadCoupleMeeting) return <NoPermissionNotice />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">פגישה עם זוג</h1>
      <p className="text-sm text-foreground/60">
        מדריך לנושאים שיש לעבור עליהם בפגישה עם זוג, ולמה שצריך להתבצע לפני ואחרי הפגישה.
      </p>

      <div className={cardClass}>
        <p className="text-sm font-semibold underline">נושאים לעבור עליהם בפגישה</p>
        <ul className={listClass}>
          <li>הכרות כללית - פרטים עליהם, על ההורים, ועל העיסוקים שלהם.</li>
          <li>לוח הזמנים של האירוע - הלו&quot;ז נמצא בטאב &quot;לוח זמנים&quot; בתוך האירוע של הזוג.</li>
          <li>דף ההנחיות שנשלח לזוג במייל לפני הפגישה - לעבור עליו יחד איתם.</li>
          <li>לעבור על הסקיצה.</li>
          <li>הסבר על ההתחייבות + הרזרבה.</li>
          <li>הסבר על מזומן לטיפים ולתשלומים לספקים.</li>
        </ul>
      </div>

      <div className={cardClass}>
        <p className="text-sm font-semibold underline">לפני הפגישה</p>
        <ul className={listClass}>
          <li>הכנת סקיצה ב-iPlan (לפי כמות ההתחייבות).</li>
          <li>שליחת דף הנחיות לזוג במייל, עד 3 ימים לפני הפגישה.</li>
        </ul>
      </div>

      <div className={cardClass}>
        <p className="text-sm font-semibold underline">אחרי הפגישה</p>
        <ul className={listClass}>
          <li>פתיחת קבוצת וואטסאפ עם הזוג.</li>
          <li>שליחת הנקודות העיקריות מהפגישה, וכן נקודות להמשך, לקבוצה.</li>
        </ul>
      </div>
    </div>
  );
}
