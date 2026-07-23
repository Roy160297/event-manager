import { PDFParse } from "pdf-parse";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import type { EventType } from "@/lib/types";

export interface ScheduleItemDraft {
  label: string;
  approx_time: string;
}

export interface SupplierDraft {
  role: string | null;
  name: string;
  phone: string | null;
}

export interface PdfImportDraft {
  name: string;
  bride_name: string | null;
  groom_name: string | null;
  event_type: EventType;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  event_manager_name: string | null;
  sales_person_name: string | null;
  service_style: string | null;
  guests_adults: number | null;
  guests_children: number | null;
  guests_reserve: number | null;
  bride_parents_names: string | null;
  groom_parents_names: string | null;
  menu_notes: string | null;
  parking_notes: string | null;
  schedule: ScheduleItemDraft[];
  suppliers: SupplierDraft[];
  warnings: string[];
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

// iPlan's export lays each "detail block" line out as `{value} {label} :`
// (value before its own label) rather than the more natural `{label}: {value}`.
// This finds the value sitting immediately before a known label on any line.
function findValueBeforeLabel(lines: string[], label: string): string | null {
  for (const line of lines) {
    const idx = line.indexOf(label);
    if (idx === -1) continue;
    const value = line.slice(0, idx).trim().replace(/[,:\s]+$/, "");
    if (value) return value;
  }
  return null;
}

function findSectionLines(lines: string[], startLabel: string, endLabel: string): string[] {
  const startIdx = lines.findIndex((line) => line.includes(startLabel));
  if (startIdx === -1) return [];
  const endIdx = lines.findIndex((line, i) => i > startIdx && line.includes(endLabel));
  const slice = endIdx === -1 ? lines.slice(startIdx + 1) : lines.slice(startIdx + 1, endIdx);
  return slice.map((l) => l.trim()).filter(Boolean);
}

function parseScheduleLine(line: string): ScheduleItemDraft | null {
  const m = line.match(/^(.+?)\s+(\d{2}:\d{2})$/);
  if (!m) return null;
  return { label: m[1].trim(), approx_time: m[2] };
}

// Supplier lines are messy and inconsistent: a role sometimes prefixes a line
// ("צלם: שחר זיסו סטילס - 0503423672"), sometimes several people share one role
// across multiple lines with no repeated label ("0502255838 יובל" right after
// the photographer line means Yuval is also a photographer), occasionally a
// role and a first name appear together with no separator at all ("מעצב שלומי"),
// and sometimes a leading phone number gets extracted before the role label on
// the same line ("0503423672 צלם: שחר זיסו סטילס"). PDF text-wrapping can also
// split what is really one row ("די ג'י: דור אבידן - 0526094443 - אור") across
// two physical lines, leaving a role-line's name with no phone yet - that case
// is tracked via `awaitingPhoneFor` so the phone on the very next line is
// attributed to that name rather than to whatever name follows it.
function parseSupplierSection(lines: string[]): SupplierDraft[] {
  const result: SupplierDraft[] = [];
  let currentRole: string | null = null;
  let awaitingPhoneFor: string | null = null;

  const flushAwaiting = (phone: string | null) => {
    if (awaitingPhoneFor) {
      result.push({ role: currentRole, name: awaitingPhoneFor, phone });
      awaitingPhoneFor = null;
    }
  };

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    const roleMatch = line.match(/^(?:(\d{9,10})\s+)?([^\d:][^:]{0,30}?)\s*:\s*(.*)$/);
    let leadingPhone: string | null = null;
    if (roleMatch) {
      flushAwaiting(null);
      leadingPhone = roleMatch[1] ?? null;
      currentRole = roleMatch[2].trim();
      line = roleMatch[3].trim();
    } else if (awaitingPhoneFor) {
      const wrappedSegments = line
        .split(/\s*-\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
      const phoneMatch = (wrappedSegments[0] ?? "").match(/^(\d{9,10})\s*(.*)$/);
      if (phoneMatch) {
        flushAwaiting(phoneMatch[1]);
        const rest = phoneMatch[2].trim();
        const remaining = rest ? [rest, ...wrappedSegments.slice(1)] : wrappedSegments.slice(1);
        for (const seg of remaining) {
          if (seg) result.push({ role: currentRole, name: seg, phone: null });
        }
        continue;
      }
    }

    const segments = line
      .split(/\s*-\s*/)
      .map((s) => s.trim())
      .filter(Boolean);

    // "role name" with no colon and no phone (e.g. "מעצב שלומי") - the first
    // word is the role, the second is the name.
    if (!roleMatch && segments.length === 1) {
      const twoTokens = segments[0].match(/^(\S+)\s+(\S+)$/);
      if (twoTokens && !/\d{9,10}/.test(segments[0])) {
        currentRole = twoTokens[1];
        result.push({ role: currentRole, name: twoTokens[2], phone: null });
        continue;
      }
    }

    let pendingName: string | null = null;
    let pendingPhone: string | null = null;
    for (const segment of segments) {
      if (/^\d{9,10}$/.test(segment)) {
        if (pendingName) {
          result.push({ role: currentRole, name: pendingName, phone: segment });
          pendingName = null;
        } else {
          pendingPhone = segment;
        }
        continue;
      }

      const spacePhoneMatch = segment.match(/^(\d{9,10})\s+(.+)$/);
      if (spacePhoneMatch) {
        result.push({ role: currentRole, name: spacePhoneMatch[2].trim(), phone: spacePhoneMatch[1] });
        continue;
      }

      if (pendingPhone) {
        result.push({ role: currentRole, name: segment, phone: pendingPhone });
        pendingPhone = null;
        continue;
      }

      if (pendingName) {
        result.push({ role: currentRole, name: pendingName, phone: null });
      }
      pendingName = segment;
    }

    if (pendingName) {
      if (roleMatch && !leadingPhone) {
        // Role line whose name has no phone yet - it may be wrapped onto the
        // next physical line, so hold it instead of committing it as final.
        awaitingPhoneFor = pendingName;
      } else if (leadingPhone) {
        result.push({ role: currentRole, name: pendingName, phone: leadingPhone });
      } else {
        result.push({ role: currentRole, name: pendingName, phone: null });
      }
    }
  }

  flushAwaiting(null);

  return result;
}

function convertDate(ddmmyyyy: string): string | null {
  const m = ddmmyyyy.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function parsePdfDraft(rawText: string): PdfImportDraft {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l !== "\f");

  const warnings: string[] = [];

  if (!(lines[0]?.includes("House") && lines[0]?.includes("No.Seven"))) {
    warnings.push('קובץ ה-PDF אינו נראה כטופס "House No.Seven" הרגיל — בדקו את הנתונים בקפידה');
  }

  // Header: "(House No.Seven) חתונה: עדי אורפז ואלכס רינסקי"
  let name = "";
  let bride_name: string | null = null;
  let groom_name: string | null = null;
  let headerEventTypeLabel: string | null = null;
  const headerLine = (lines[0] ?? "").replace(/^\([^)]*\)\s*/, "");
  const headerMatch = headerLine.match(/^(.+?):\s*(.+)$/);
  if (headerMatch) {
    headerEventTypeLabel = headerMatch[1].trim();
    name = headerMatch[2].trim();
    const nameParts = name.split(/\s+ו(?=\S)/);
    if (nameParts.length === 2) {
      bride_name = nameParts[0].trim();
      groom_name = nameParts[1].trim();
    } else {
      bride_name = name;
      warnings.push('לא ניתן היה לפצל את שמות בני הזוג אוטומטית - בדקו את השדה "שם"');
    }
  } else {
    warnings.push("לא נמצאה שורת כותרת תקינה בקובץ");
  }

  // Summary block (tab-separated): "תאריך האירוע:\t19:30 16/07/2026\tסוג הגשה:\tמזנונים ..."
  const summaryLine = lines.find((l) => l.includes("תאריך האירוע:")) ?? "";
  const startTimeMatch = summaryLine.match(/תאריך האירוע:\s*(\d{2}:\d{2})/);
  const serviceStyleMatch = summaryLine.match(/סוג הגשה:\s*([^\s\t]+)/);

  const service_style = serviceStyleMatch?.[1] ?? findValueBeforeLabel(lines, "תפריט");

  // "סוג אירוע" only ever says "חתונה" / "חתונה הפוכה" - it never carries the
  // מזנונים/הגשה distinction, which instead lives in the separate "תפריט"
  // (a.k.a. "סוג הגשה") field. EVENT_TYPE_LABELS' wedding entries are compound
  // ("חתונה - מזנונים" etc.), so for weddings the two fields must be combined;
  // every other event type (בת/בר מצווה, אירוע עסקי...) matches directly.
  const eventTypeValue = findValueBeforeLabel(lines, "סוג אירוע") ?? headerEventTypeLabel;
  const isWeddingFamily = !!eventTypeValue?.includes("חתונה");
  const isReverse = !!eventTypeValue?.includes("הפוכה");
  const isServiceStyle = service_style === "הגשה";

  let event_type: EventType;
  if (isWeddingFamily) {
    event_type = isReverse
      ? isServiceStyle
        ? "reverse_wedding_service"
        : "reverse_wedding"
      : isServiceStyle
        ? "wedding_service"
        : "wedding";
    if (service_style && service_style !== "מזנונים" && service_style !== "הגשה") {
      warnings.push(`סוג הגשה "${service_style}" אינו "מזנונים" או "הגשה" - נבחרה ברירת המחדל "מזנונים"`);
    }
  } else {
    event_type =
      (Object.entries(EVENT_TYPE_LABELS).find(([, label]) => label === eventTypeValue)?.[0] as
        | EventType
        | undefined) ?? "other";
    if (eventTypeValue && event_type === "other" && eventTypeValue !== EVENT_TYPE_LABELS.other) {
      warnings.push(`סוג האירוע "${eventTypeValue}" לא זוהה - נבחר "אחר" כברירת מחדל`);
    }
  }

  const eventDateRaw = findValueBeforeLabel(lines, "תאריך אירוע");
  const event_date = eventDateRaw ? convertDate(eventDateRaw) : null;
  if (!event_date) warnings.push("לא נמצא תאריך אירוע תקין בקובץ");

  const event_manager_name = findValueBeforeLabel(lines, "מנהל אירוע");
  const sales_person_name = findValueBeforeLabel(lines, "מכירות");
  const end_time = findValueBeforeLabel(lines, "שעת סיום אירוע");

  const schedule = findSectionLines(lines, "לוז אירוע", "ספקים")
    .map(parseScheduleLine)
    .filter((item): item is ScheduleItemDraft => item !== null);

  const start_time = startTimeMatch?.[1] ?? schedule[0]?.approx_time ?? null;
  if (!start_time) warnings.push("לא נמצאה שעת התחלה - יש להזין ידנית");

  const commitmentLine = findValueBeforeLabel(lines, "התחייבות סופית") ? lines.find((l) => l.includes("התחייבות סופית")) : null;
  const adultsMatch = commitmentLine?.match(/(\d+)\s*אורחים\s*מבוגרים\s*:/);
  const childrenMatch = commitmentLine?.match(/(\d+)\s*,?\s*ילדים\s*:/);
  const reserveMatch = commitmentLine?.match(/(\d+)\s*,?\s*אורחים\s*רזרבה\s*:/);
  const guests_adults = adultsMatch ? Number(adultsMatch[1]) : null;
  const guests_children = childrenMatch ? Number(childrenMatch[1]) : null;
  const guests_reserve = reserveMatch ? Number(reserveMatch[1]) : null;

  const bride_parents_names = findValueBeforeLabel(lines, "שמות הורי הכלה");
  const groom_parents_names = findValueBeforeLabel(lines, "שמות הורי החתן");

  const menuNotesLines = findSectionLines(lines, "מידע", "לוז אירוע");
  const menu_notes = menuNotesLines.length > 0 ? menuNotesLines.join("\n") : null;

  const parking_notes = findValueBeforeLabel(lines, "חניה");

  const suppliers = parseSupplierSection(findSectionLines(lines, "ספקים", "חניה"));
  const lowConfidenceSuppliers = suppliers.filter((s) => s.role === null && s.phone === null).length;
  if (lowConfidenceSuppliers > 0) {
    warnings.push(`${lowConfidenceSuppliers} מתוך רשימת הספקים לא זוהו במלואם - יש לבדוק ולהשלים ידנית`);
  }

  return {
    name,
    bride_name,
    groom_name,
    event_type,
    event_date,
    start_time,
    end_time,
    event_manager_name,
    sales_person_name,
    service_style,
    guests_adults,
    guests_children,
    guests_reserve,
    bride_parents_names,
    groom_parents_names,
    menu_notes,
    parking_notes,
    schedule,
    suppliers,
    warnings,
  };
}
