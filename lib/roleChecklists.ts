import type { ClosingChecklistCategory } from "@/lib/closingChecklist";
import type { EventType, PermissionResource } from "@/lib/types";

// Three more of the venue's paper closing checklists, each signed by a
// different role (Floor Manager, Bar Manager, Barista), separate from
// the event-manager one in lib/closingChecklist.ts. Each is a single flat
// category since the paper sheets aren't subdivided like the general one.
// (The kitchen checklist that used to live here was removed - its ground
// is covered by the general checklist's own kitchen-related items.)
export interface RoleChecklistDefinition {
  key: PermissionResource;
  label: string;
  categories: ClosingChecklistCategory[];
  // Every checklist ends in a free-text note box for anything not covered by
  // a checkable item. Barista's paper sheet specifically ends in a
  // deficiency list, so it keeps that wording; the rest use a generic label.
  noteLabel?: string;
  // Omitted -> shown for every event, matching the 3 role checklists below.
  // Present -> this checklist only shows (and only gets added to) events of
  // one of these types - see business_event_checklist, gated to business
  // events only in the Tasks page's rendering loop.
  eventTypes?: EventType[];
}

export const ROLE_CHECKLISTS: RoleChecklistDefinition[] = [
  // Listed first so it's the first checklist shown on an אירוע עסקי's Tasks
  // tab, ahead of the role checklists below (which is also true for every
  // other event type, since eventTypes hides it from all of them entirely).
  {
    key: "business_event_checklist",
    label: "צ'קליסט סגירה - אירוע עסקי",
    noteLabel: "הערות",
    eventTypes: ["business_event"],
    categories: [
      {
        key: "business-event-vendors",
        label: "ספקי הפקה",
        items: [
          {
            key: "biz-production-vendor-departure-timing",
            text: "ווידוא עם ההפקה שכלל הספקים יודעים מתי להגיע בסיום האירוע: במה, הגברה ותאורה, עיצוב, מיתוג וכו'.",
          },
          { key: "biz-production-rep-stays-until-done", text: "הישארות נציג הפקה עד סיום עבודת הספקים." },
          {
            key: "biz-vendor-tasks-review-before-leaving",
            text: "מעבר עם כל ספק על ביצוע כלל משימותיו טרם עזיבתו (כולל פינוי זבל).",
          },
          { key: "biz-yard-morning-items", text: "השארת פריטים לבוקר מרוכז בחצר." },
        ],
      },
    ],
  },
  {
    key: "floor_manager_checklist",
    label: "צ'קליסט סגירה - מנהל פלור",
    noteLabel: "הערות",
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
            text: "כלי הלחם נאספים מהשולחנות ומסודרים במקומם נקיים אחרי שטיפה.",
          },
          {
            key: "fm-serving-equipment",
            text: "כלי הגשה (מלקחיים, כפות הגשה, מלח-פלפל) וכלי חימום עוברים ניקיון ומסודרים במקומות הייעודיים.",
          },
          { key: "fm-table-numbers", text: "מספרי השולחנות בארגז שלהם." },
          {
            key: "fm-gallery",
            text: "מעבר על הגלריה (ניקוי שולחנות, לטאטא רצפה, ולוודא שמזנון הגלריה נקי ומסודר). - כמה שניתן לסדר עד לסגירה",
          },
          {
            key: "fm-waiters-room",
            text: "לוודא סדר וניקיון בחדר המלצרים - שיהיה כמה שיותר מוכן לסגירה.",
          },
          { key: "fm-chuppah-cleanup", text: "ניקיון שולחן חופה ושברי זכוכית ולכלוך מהרצפה." },
          {
            key: "fm-trays-count-before-exit",
            text: "ריכוז וספירת מגשים לפני יציאה + השארת 4 מגשים לפירוק - להשאיר על מכונת הקרח.",
          },
        ],
      },
    ],
  },
  {
    key: "bar_checklist",
    label: "צ'קליסט סגירה - בר",
    noteLabel: "הערות",
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
    key: "barista_checklist",
    label: "צ'קליסט סגירה - בריסטה",
    noteLabel: "רשימת חוסרים",
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
