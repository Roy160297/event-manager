// Fixed catalog for the venue's paper "closing checklist" - same list for
// every event, so it lives here in code rather than in the database. Only
// which items are checked per event is persisted (closing_checklist_checks).
// Order within each category follows the chronological flow of closing down
// after an event (yard -> hall -> offices -> electrical -> locks).
export interface ClosingChecklistItem {
  key: string;
  text: string;
}

export interface ClosingChecklistCategory {
  key: string;
  label: string;
  items: ClosingChecklistItem[];
}

export const CLOSING_CHECKLIST: ClosingChecklistCategory[] = [
  {
    key: "yard",
    label: "חצר + חזיתות",
    items: [
      {
        key: "pre-breakdown-briefing",
        text: "ביצוע בריף לצוות הפירוק עם חלוקת משימות ודגשים - לוודא התנהלות זהירה במיוחד בחלל האולם ובמטבחים.",
      },
      { key: "yard-reception-cleanup", text: "ניקיון עמדות קבלת פנים: ניקיון של כל החלק העליון + בטן המזנון." },
      {
        key: "yard-reception-trash-pile",
        text: "פינוי של פחים עמדות קבלת הפנים - מרוכזים בערימה בתוך האולם ליד המקרר קרח בעמדת פינויים.",
      },
      {
        key: "yard-ice-fridge-area",
        text: "לוודא שאזור מקרר הקרח בעמדת הפינויים נקי ומסודר (כולל חיפוש מפיות, מגשים וציוד מאחורי המקרר).",
      },
      {
        key: "yard-reception-leftover-equipment",
        text: "נשאר בעמדות קבלת פנים: סטנדים, כלי הגשה כבדים (משטח אבן וקרמיקה מוגבהת). כבלים מאריכים מקופלים בפנים.",
      },
      {
        key: "yard-bread-oven",
        text: "ניקיון יסודי של תנור הלחם + מלקחי הוצאת הלחם ומקררי החצר.",
      },
      { key: "yard-furniture-cleaning", text: "ניקוי ריהוט חצר: ניקוי שולחנות קפה, כסאות, ספות + שולחן נלווה." },
      { key: "yard-sofa-cushions", text: "החזרת כריות ספות האירוח פנימה." },
      { key: "yard-tables-cover", text: "כיסוי שולחנות חצר." },
      { key: "yard-sweep", text: "מטאטא יסודי בחצר." },
      { key: "yard-chuppah-cleanup", text: "ניקיון שולחן חופה ושברי זכוכית וזוהמה מהרצפה." },
      {
        key: "yard-hostess-station",
        text: "ניקיון עמדת מארחת + בטן העמדה + כיסאות + עמדות חבלול, ולהכניס אותה בסיום האירוע פנימה.",
      },
      {
        key: "yard-tablecloths-sorting",
        text: "לוודא שכל המפות והמפיות (לבנות/שמנת/שחורות) נכנסות לשקיות כתומות בסמוך לכניסה לאולם.",
      },
      {
        key: "yard-glasses-cigarettes",
        text: "פינוי כוסות וסיגריות מהיקף החצר, וכל העציצים והאדניות בחצר ובתוך האולם.",
      },
      { key: "yard-ashtrays", text: "לנקות מאפרות אפורות (שטיפה במטבח) ולרכז ליד שביל הפחים." },
      { key: "yard-sidewalk-scan", text: "סריקה של המדרכה בצידי האולם, איסוף חפצים שנשארו בחוץ (כוסות וכלים)." },
      { key: "yard-trash-bins", text: "לוודא שפחי האשפה סגורים ואין דליפה על הרצפה." },
      { key: "yard-return-bins", text: "החזרת פחי הפינויים למקומם ולוודא שלמשאית יש גישה נוחה לפחים." },
    ],
  },
  {
    key: "hall",
    label: "אולם",
    items: [
      {
        key: "hall-buffet-cleaning",
        text: 'ניקיון כל עמדות המזנונים באולם: חלק עליון + בטן במזנון. לא נשאר כלום (מלבד פק"ל מזנון). לוודא שאין שאריות אוכל - הזזת כל המזנונים לצורך ניקיון יסודי.',
      },
      { key: "hall-buffet-cables", text: "ניתוק כבלי חשמל מקירות עמדות המזנונים." },
      { key: "hall-black-bins", text: 'פחים שחורים באירועים חד"פ שעברו שטיפה - מתרכזים לפני חדר המלצרים.' },
      { key: "hall-after-equipment", text: "כלי הגשה וציוד האפטר - מנוקה ומוחזר לארגז ציוד." },
      {
        key: "hall-tables-cleaning",
        text: "ניקיון שולחנות עם סקוץ' וסבון ומים (לא להרטיב את הפלטת העץ) - מנהל צריך לפקח שלא שמים הרבה סבון.",
      },
      { key: "hall-chairs-cleaning", text: "ניקיון כסאות משאריות אוכל ופירורים, ולאחר מכן לערום אותם." },
      {
        key: "hall-gallery",
        text: "מעבר על הגלריה (ניקוי שולחנות, כסאות, גרם מדרגות ווידוא שרצפת המזנון בגלריה נקייה ומסודרת).",
      },
      { key: "hall-drainage-strip", text: "ניקיון פס הניקוז." },
      { key: "hall-ice-cream-fridge", text: "לוודא שמקרר הגלידה מחובר לחשמל." },
      { key: "hall-full-scan", text: "סריקת מטבחים כוללת: שוטף כלים שביצע את כל משימותיו, מזנונים, עמדות." },
      {
        key: "hall-waiters-cabinet-and-room",
        text: "לוודא סדר בארון המלצרים (פנקסים, מגבונים, עטים, קיסמים וכפפות - כל אחד בתא שלו), וכן ניקיון וסדר בחדר המלצרים והלוקרים - תלייה מסודרת של כל החולצות הנקיות על הקולבים, תיקון הסינרים, וסידור המדפים מעל הלוקרים.",
      },
      {
        key: "hall-shirts-sorting",
        text: "חולצות שחורות מלוכלכות בכניסה לחדר בשקית כתומה; חולצות נקיות חוזרות לקולב.",
      },
      {
        key: "hall-aprons-sorting",
        text: "סינרים שחורים (סינרי חצי וסינרי מזנונים) - ספורים ומחולקים לשתי שקיות כתומות: נקי / מלוכלך, עם פתק מספר הפריטים בכל שקית.",
      },
      {
        key: "hall-faulty-equipment",
        text: "ציוד או סינרים תקולים - לשים בשקית הייעודית לכך ולעדכן את שניר.",
      },
      {
        key: "hall-radios",
        text: "החזרת מכשירי הקשר לארון בחדר מלצרים כבויים, ולוודא שהם טעונים כראוי (אור אדום).",
      },
      { key: "hall-dj-stations", text: "מעבר על פינוי וניקיון בשתי עמדות הדיג'יי." },
      { key: "hall-bride-groom-room", text: "מעבר על פינוי וניקיון בחדר החתן והכלה." },
      { key: "hall-tools-gathered", text: "ריכוז מגבים, מטאטאים ויעים במסודר בסיום הפירוק." },
    ],
  },
  {
    key: "offices",
    label: "משרדים",
    items: [
      { key: "office-kitchen-dishes", text: "פינוי כלים ממטבח המשרדים + ניקיון הכיור." },
      { key: "office-ac-off", text: "לכבות את המזגנים." },
      {
        key: "office-hostess-equipment",
        text: "לוודא שהדברים מעמדת המארחות חזרו: 2 אייפדים, 2 קאונטרים, 2 מטענים.",
      },
      { key: "office-ipads-charging", text: "האייפדים מחוברים לטעינה." },
      { key: "office-photo-summary", text: 'צילום הקאונטרים ועמוד "הצטרפות אורחים" - ושליחת סיכום במייל.' },
    ],
  },
  {
    key: "electrical",
    label: "מערכות חשמליות",
    items: [
      { key: "electrical-hall-power", text: "כיבוי החשמל באולם (ארון חשמל מעל המטבח וארון חשמל במטבח החיצוני)." },
      { key: "electrical-hall-ac", text: "כיבוי מזגנים באולם (ליד עמדת מגנטים ובכניסה למטבח)." },
      { key: "electrical-hall-hood", text: "כיבוי מנדף אולם." },
      { key: "electrical-stoves-off", text: "כיבוי כיריים." },
      { key: "electrical-warming-cabinets", text: "לוודא שארונות החימום כבויים ונקיים." },
      { key: "electrical-kitchen-hood", text: "כיבוי מנדף מטבח יצרן." },
      { key: "electrical-yard-fans", text: "כיבוי מאווררים וצ'ילרים באולם ובחצר." },
      { key: "electrical-inner-bar-light", text: "כיבוי תאורה מאחורי הבר הפנימי." },
      { key: "electrical-path-light", text: "כיבוי תאורת השביל." },
      { key: "electrical-restroom-light", text: "כיבוי תאורת השירותים." },
      { key: "electrical-disposal-lights", text: "כיבוי אורות עמדת הפינויים." },
      {
        key: "electrical-niche-cleaning",
        text: "ניקיון נישת החשמל משאריות אוכל, קשים, לימונים, בדלי סיגריות וכל לכלוך אחר.",
      },
      { key: "electrical-breaker-check", text: "לוודא שלא ירדו מפסיקים 3, 8, 10 (בלוח החשמל)." },
    ],
  },
  {
    key: "locks",
    label: "נעילות + אזעקה",
    items: [
      {
        key: "lock-tips-safe",
        text: "העברת מעטפות הטיפים (מלצרים ומטבח) לכספת של לירן.",
      },
      {
        key: "lock-black-bag-envelopes",
        text: "איסוף שקית שחורה מהבר / מהמאבטח המיועדת למעטפות לכספת - האיסוף מתבצע יחד עם מאבטח ואחד מבני הזוג.",
      },
      { key: "lock-safe", text: "נעילת כספת הזוג והחזרת המפתח למקומו." },
      { key: "lock-liran-office", text: "נעילת משרד לירן." },
      { key: "lock-offices", text: "נעילת דלת הכניסה למשרדים." },
      { key: "lock-office-kitchenette", text: "נעילת דלת מטבח המשרדים." },
      { key: "lock-cafe-door", text: "נעילת דלת המטבחון/קפיטריה." },
      { key: "lock-main-gate", text: "נעילת שער הכניסה לאולם." },
      { key: "lock-briefing-door", text: "נעילת דלת הבריף (מנעול עליון ותחתון)." },
      { key: "lock-magnet-door", text: "נעילת דלת המגנטים (מנעול עליון ותחתון)." },
      { key: "lock-waiters-room-inner-door", text: "נעילת הדלת הפנימית בחדר המלצרים." },
      { key: "lock-emergency-exit", text: "נעילת דלת היציאה לפחים." },
      { key: "lock-inner-kitchen-door", text: "נעילת דלת המטבח הפנימי." },
      { key: "lock-outside-white-metal-door", text: "נעילת דלת חדר הקירור במטבח החיצוני." },
      { key: "lock-hall-kitchen-disposal-door", text: "נעילת דלת היציאה לרחוב ממטבח הפינויים באולם." },
      { key: "lock-alarm-activation", text: "הפעלת אזעקה בסיום האירוע." },
    ],
  },
];

export const ALL_CLOSING_CHECKLIST_KEYS = new Set(
  CLOSING_CHECKLIST.flatMap((category) => category.items.map((item) => item.key)),
);
