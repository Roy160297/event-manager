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
      { key: "yard-reception-cleanup", text: "ניקיון עמדות קבלת פנים: ניקיון של כל החלק העליון + בטן המזנון." },
      {
        key: "yard-reception-trash-pile",
        text: "פינוי של פחים עמדות קבלת הפנים - מרוכזים בערימה בתוך האולם ליד המקרר קרח בעמדת פינויים.",
      },
      {
        key: "yard-reception-leftover-equipment",
        text: "נשאר בעמדות קבלת פנים: סטנדים, כלי הגשה כבדים (משטח אבן וקרמיקה מוגבהת). כבלים מאריכים מקופלים בפנים.",
      },
      { key: "yard-furniture-cleaning", text: "ניקוי ריהוט חצר: ניקוי שולחנות קפה, כסאות, ספות + שולחן נלווה." },
      { key: "yard-sofa-cushions", text: "החזרת כריות ספות האירוח פנימה." },
      { key: "yard-tables-cover", text: "כיסוי שולחנות חצר." },
      { key: "yard-sweep", text: "מטאטא יסודי בחצר." },
      { key: "yard-chuppah-cleanup", text: "ניקיון שולחן חופה ושברי זכוכית מהרצפה." },
      {
        key: "yard-hostess-station",
        text: "ניקיון עמדת מארחת + בטן העמדה + כיסאות + עמדות חבלול, ולהכניס אותה בסיום האירוע פנימה.",
      },
      { key: "yard-glasses-cigarettes", text: "פינוי כוסות וסיגריות מהיקף החצר וכל העציצים והאדניות." },
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
      { key: "hall-ice-cream-fridge", text: "לוודא שמקרר הגלידה מחובר לחשמל." },
      { key: "hall-full-scan", text: "סריקת מטבחים כוללת: שוטף כלים שביצע את כל משימותיו, מזנונים, עמדות." },
      {
        key: "hall-radios",
        text: "החזרת מכשירי הקשר לארון בחדר מלצרים כבויים, ולוודא שהם טעונים כראוי (אור אדום).",
      },
      { key: "hall-waiters-floor-sweep", text: "מטאטא על רצפת אזור המלצרים - משאריות אוכל, בדלי סיגריות וכלים." },
    ],
  },
  {
    key: "offices",
    label: "משרדים",
    items: [
      { key: "office-kitchen-dishes", text: "פינוי כלים ממטבח המשרדים + ניקיון הכיור." },
      { key: "office-ac-off", text: "לכבות את המזגנים." },
      { key: "office-photo-summary", text: 'צילום הקאונטרים ועמוד "הצטרפות אורחים" - ושליחת סיכום במייל.' },
      {
        key: "office-hostess-equipment",
        text: "לוודא שהדברים מעמדת המארחות חזרו: 2 אייפדים, 2 קאונטרים, 2 מטענים.",
      },
      { key: "office-ipads-charging", text: "האייפדים מחוברים לטעינה." },
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
      { key: "electrical-kitchen-hood", text: "כיבוי מנדף מטבח יצרן." },
      { key: "electrical-yard-fans", text: "כיבוי מאווררים וצ'ילרים באולם ובחצר." },
    ],
  },
  {
    key: "locks",
    label: "נעילות + אזעקה",
    items: [
      { key: "lock-offices", text: "נעילת משרדים." },
      { key: "lock-safe", text: "נעילת הכספת והחזרת המפתח למקומו." },
      { key: "lock-waiters-steel-door", text: "נעילת דלת פלדלת בחדר מלצרים." },
      { key: "lock-briefing-door", text: "נעילת דלת בריף." },
      { key: "lock-emergency-exit", text: "נעילת דלתות יציאת חירום." },
      { key: "lock-hall-kitchen-disposal-door", text: "נעילת דלת מטבח פינויים אולם." },
      { key: "lock-manufacturer-kitchen-doors", text: "נעילת כל דלתות המטבח יצרן - 2 דלתות." },
      { key: "lock-back-gate", text: "נעילת שער אחורי." },
      { key: "lock-main-gate", text: "נעילת שער ראשי." },
    ],
  },
];

export const ALL_CLOSING_CHECKLIST_KEYS = new Set(
  CLOSING_CHECKLIST.flatMap((category) => category.items.map((item) => item.key)),
);
