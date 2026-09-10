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
      <p className="text-sm text-foreground/80">
        מדריך לנושאים שיש לעבור עליהם בפגישה עם זוג, ולמה שצריך להתבצע לפני ואחרי הפגישה.
      </p>

      <div className={cardClass}>
        <p className="text-sm font-semibold underline">לפני הפגישה</p>
        <ul className={listClass}>
          <li>ווידוא הגעה בזמן לפגישה מול הזוג.</li>
        </ul>
      </div>

      <div className={cardClass}>
        <p className="text-sm font-semibold underline">נושאים לעבור עליהם בפגישה</p>
        <ul className={listClass}>
          <li>הכרות כללית - פרטים עליהם, על ההורים, ועל העיסוקים שלהם.</li>
          <li>מילוי סקירה - בדיקה לגבי חניה, אפטר ובר מרובע.</li>
          <li>לוח הזמנים של האירוע - הלו&quot;ז נמצא בטאב &quot;לוח זמנים&quot; בתוך האירוע של הזוג.</li>
          <li>לעבור עם הזוג על דף ההנחיות (יישלח אליהם במייל לאחר הפגישה).</li>
          <li>להסביר על הסקיצה.</li>
          <li>הסבר על ההתחייבות + הרזרבה.</li>
          <li>הסבר על מזומן לטיפים ולתשלומים לספקים.</li>
        </ul>
      </div>

      <div className={cardClass}>
        <p className="text-sm font-semibold underline">אחרי הפגישה</p>
        <ul className={listClass}>
          <li>פתיחת קבוצת וואטסאפ עם הזוג (עד יום אחרי הפגישה).</li>
          <li>שליחת הנקודות העיקריות מהפגישה ונקודות להמשך (עד יום אחרי הפגישה).</li>
          <li>שליחת דף ההנחיות לזוג במייל, לאחר שעברתם עליו יחד בפגישה (עד יום אחרי הפגישה).</li>
          <li>שליחת טופס האירוע לזוג (עד יום אחרי הפגישה).</li>
          <li>העלאת טופס אירוע ל-iPlan (עד יום אחרי הפגישה).</li>
          <li>הכנת סקיצה ראשונית ב-iPlan (לפי כמות ההתחייבות) (עד יום אחרי הפגישה).</li>
          <li>עדכון התחייבות סופית בפרטי האירוע והעלאת טופס אירוע סופי ל-iPlan (כשבוע לפני האירוע).</li>
          <li>העלאת סקיצה סופית לאתר - לאחר התחייבות סופית (יום לפני האירוע).</li>
          <li>העלאת קובץ הזמנות (אורחים) לאתר (יום לפני האירוע).</li>
          <li>ווידוא שהזוג מביא את כל הציוד והמעטפות (יום לפני האירוע).</li>
        </ul>
      </div>
    </div>
  );
}
