import type { ClosingChecklistCategory } from "@/lib/closingChecklist";
import type { PermissionResource } from "@/lib/types";

// Four more of the venue's paper closing checklists, each signed by a
// different role (Floor Manager, Bar Manager, Cook, Barista), separate from
// the event-manager one in lib/closingChecklist.ts. Each is a single flat
// category since the paper sheets aren't subdivided like the general one.
export interface RoleChecklistDefinition {
  key: PermissionResource;
  label: string;
  categories: ClosingChecklistCategory[];
}

export const ROLE_CHECKLISTS: RoleChecklistDefinition[] = [
  {
    key: "floor_manager_checklist",
    label: "צ'קליסט סגירה - מנהל פלור",
    categories: [
      {
        key: "floor-manager",
        label: "צ'קליסט סגירה - מנהל פלור",
        items: [
          {
            key: "fm-reception-cleanup",
            text: "ניקיון עמדות קבלת פנים: חלק עליון + בטן המזנון. נשאר במזנון: סטנדים, כלי הגשה כבדים (משטח אבן וקרמיקה מוגבהת). כבלים מאריכים מקופלים בפנים.",
          },
          {
            key: "fm-vegetables-fridge",
            text: "לוודא שכל הירקות נאספו והוחזרו למקרר הירקות בקומה העליונה במטבח.",
          },
          {
            key: "fm-bread-utensils",
            text: "כלי הלחם נאספים מהשולחנות ומסודרים במדפי הנירוסטה במטבח (הכנות) אחרי שטיפה - ללא שאריות לחם.",
          },
          {
            key: "fm-serving-equipment",
            text: "כלי הגשה (מלקחיים, כפות הגשה, מאפרות, פלטה-פלפל) וכלי חימום עוברים ניקיון עם מטלית ומשחה, ומסודרים בשני בסקטים ייעודיים.",
          },
          {
            key: "fm-candles",
            text: "החזרת כלי הנרות באופן מסודר לארגז השחור, לוודא ניקיון ומצב הנרות, ולרוקן את הנרות המשומשים כך שיישאר רק הכלי.",
          },
          { key: "fm-table-numbers", text: "מספרי השולחנות בארגז שלהם." },
          {
            key: "fm-equipment-check",
            text: "וידוא שכל הציוד חזר ומסודר - סריקה אצל השוטף מטבח, מזנונים, עמדות הכנות ומאפייה שלא נשאר ציוד קייטרינג.",
          },
          {
            key: "fm-gallery",
            text: "מעבר על הגלריה (ניקוי שולחנות, לטאטא רצפה, ולוודא שמזנון הגלריה נקי ומסודר).",
          },
          {
            key: "fm-waiters-cabinet",
            text: "לוודא סדר בארון המלצרים: פנקסים, מגבונים, עטים, קיסמים וכפפות - כל אחד בתא שלו.",
          },
          {
            key: "fm-waiters-room",
            text: "חדר מלצרים ולוקרים - לוודא ניקיון וסדר, עם דגש על תלייה מסודרת של כל החולצות הנקיות על הקולבים ותיקון הסינרים, וסידור המדפים מעל הלוקרים.",
          },
          {
            key: "fm-aprons-shirts-sorting",
            text: "סינרים שחורים (סינרי חצי וסינרי מזנונים) - ספורים ומחולקים לשתי שקיות כתומות: נקי/מלוכלך. חולצות שחורות מלוכלכות בכניסה לחדר בשקית כתומה, נקיות חוזרות לקולב.",
          },
          { key: "fm-glasses-cigarettes", text: "פינוי כוסות וסיגריות מהעציצים והאדניות." },
          { key: "fm-chuppah-cleanup", text: "ניקיון שולחן חופה ושברי זכוכית מהרצפה." },
          { key: "fm-offices-cleanup", text: "פינויים וניקוי במשרדים, לכבות גם את המזגן." },
          { key: "fm-warming-cabinets", text: "לוודא שארונות החימום כבויים ונקיים." },
        ],
      },
    ],
  },
  {
    key: "bar_checklist",
    label: "צ'קליסט סגירה - בר",
    categories: [
      {
        key: "bar",
        label: "צ'קליסט סגירה - בר",
        items: [
          { key: "bar-sweep-mop", text: "ניקוי מטאטא ומגב בעמדה בה היה הבר במהלך האירוע (כולל בר חוץ)." },
          { key: "bar-rubber-surfaces", text: "ניגוב עם סמרטוט את משטחי הגומי בברים." },
          { key: "bar-outer-cleaning", text: "ניקיון הבר מהחלק החיצוני (מים, סבון וסמרטוט)." },
          { key: "bar-trash", text: "פינוי כל הזבל השייך לבר לפחים." },
          { key: "bar-adjacent-surfaces", text: "ניקיון משטחי העמודים שצמודים לבר." },
          {
            key: "bar-consolidate",
            text: "ריכוז הברים במקום המיועד לכך + ריכוז שאר חתיכות הבר בצידי האולם.",
          },
          { key: "bar-kitchen-drinks-check", text: "בדיקה במטבח באזור המשקאות שאין ארון בקבוקים וקרטונים." },
          { key: "bar-disposal-check", text: "בדיקה בעמדת הפינויים שאין ספריט שם כלום." },
          { key: "bar-cabinets-locked", text: "סריקה שכל הארונות נעולים." },
          { key: "bar-disposal-scan", text: "סריקה בפינויים שאין קרטונים ודברים שקשורים לבר." },
          { key: "bar-prep-next-event", text: "הכנת הבר לאירוע הבא על פי הנהלים." },
          { key: "bar-cover-outer", text: "לכסות בר חיצוני." },
          {
            key: "bar-glasses-removal",
            text: "פינוי כל הכוסות מהברים במידה ואין אירוע עד 3 ימים אחרי.",
          },
        ],
      },
    ],
  },
  {
    key: "kitchen_checklist",
    label: "צ'קליסט סגירה - מטבח",
    categories: [
      {
        key: "kitchen",
        label: "צ'קליסט סגירה - מטבח",
        items: [
          { key: "kitchen-briefing", text: "ביצוע בריף לצוות שנשאר לטבח האחרון לסגירת המטבח." },
          { key: "kitchen-ovens-off", text: "כיבוי תנורים + פלנצות + ציפסרים." },
          { key: "kitchen-gas-valve", text: "סגירת ברז גז ראשי." },
          { key: "kitchen-warming-cabinets-off", text: "כיבוי ארונות חימום." },
          { key: "kitchen-hood-off", text: "כיבוי מנדף." },
          { key: "kitchen-drainage-channels", text: "ניקיון תעלות ניקוז." },
          { key: "kitchen-floor-cleaning", text: "ניקיון ושטיפת רצפה." },
          { key: "kitchen-lights-off", text: "כיבוי אורות (כולל מנדפים)." },
          { key: "kitchen-carts", text: "פינוי עגלות, גדולות וקטנות." },
          { key: "kitchen-equipment", text: "פינוי ציודים שקשורים למטבח." },
          { key: "kitchen-fridges", text: "ריקון מקררים וניקיונם." },
          {
            key: "kitchen-general-cleaning",
            text: "ניקיון כללי - מקררים, מנדפים, ארונות, מדפים, שולחנות, ארונות עליונים ומדפים תחתונים.",
          },
        ],
      },
    ],
  },
  {
    key: "barista_checklist",
    label: "צ'קליסט סגירה - בריסטה",
    categories: [
      {
        key: "barista",
        label: "צ'קליסט סגירה - בריסטה",
        items: [
          {
            key: "barista-cabinet-cleaning",
            text: "הוצאת כלי הקפה והמוצרים מהארון ומהקירור, וניקיון הארון והמדפים עם סבון, מים חמים וסקוץ'.",
          },
          { key: "barista-double-cabinet", text: "סידור הארון הכפול שמתחת לעמדת הקפה וניקוי ארון הקפה." },
          { key: "barista-machine-grinder", text: "ניקיון המכונה מלמעלה (כולל ספירת ניירות) והמטחנה." },
          { key: "barista-floor-sweep", text: "טיאטוא רצפת אזור עמדת הקפה." },
          { key: "barista-wall-cabinets", text: "ניקיון הקיר מאחורי עמדת הקפה, כולל הארונות." },
          {
            key: "barista-dirty-dishes",
            text: "איסוף כל הכלים המלוכלכים בשטח העמדה (כוסות, תחתיות, כפיות) והעברתם לפיילה בצורה מסודרת.",
          },
          {
            key: "barista-clean-dishes",
            text: "עם סיום האירוע יש לסדר את הכלים הנקיים ולהשאיר בבסקטים ייעודיים בצורה מסודרת, ולהחזיר כלים לפינויים.",
          },
          {
            key: "barista-baskets",
            text: "הוצאה מסודרת של כל הבסקטים (הריקים והמלאים) שנשארו בעמדה, והעברתם לקיפול לקראת סגירת העמדה.",
          },
          { key: "barista-napkins-fill", text: "לוודא מילוי מגבוני ניקיון מכל הסוגים (שורה לכל צבע)." },
          {
            key: "barista-sugar-fill",
            text: "לוודא מילוי סוכר, סוכר חום וסוכרזית - הכלים מלאים עד הסוף.",
          },
          { key: "barista-coffee-beans-fill", text: "לוודא מילוי של 2 שקיות פולי קפה חדשות בבטן הארון." },
          {
            key: "barista-boiler-water",
            text: "לוודא בסיום המשמרת שהמיחם נשאר עם מעט מים (מכסים את מנגנון החימום); בפתיחת המשמרת הבאה יש לרוקן ולמלא מים חדשים.",
          },
          { key: "barista-grinder-empty", text: "לרוקן פולי קפה מהמטחנה לקופסת פלסטיק של 2-4 ליטר." },
          { key: "barista-decorations", text: "לרכז את כל הדקורציה בבטן העמדה." },
          { key: "barista-milk-fridge", text: "לוודא שמקרר החלב מחובר לחשמל בסוף הערב." },
          { key: "barista-cover-machine", text: "כיסוי מכונת הקפה." },
        ],
      },
    ],
  },
];

export const ROLE_CHECKLIST_KEYS: Record<string, Set<string>> = Object.fromEntries(
  ROLE_CHECKLISTS.map((checklist) => [
    checklist.key,
    new Set(checklist.categories.flatMap((category) => category.items.map((item) => item.key))),
  ]),
);
