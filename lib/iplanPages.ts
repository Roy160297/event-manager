import type { GeminiExtraction } from "@/lib/imageImport";
import type { IplanEventPayload } from "@/lib/iplanSync";
import { isFriday } from "@/lib/scheduleTime";

// The browser extension is a thin relay: it fetches iPlan's pages and sends a
// plain dump of each one (text lines, staff labels, links). Everything that
// knows what iPlan's pages MEAN lives here, so a change in iPlan's wording or
// layout is fixed by deploying the site - not by re-installing the extension.
export interface PageDump {
  lines: string[];
  labels: { name: string; role: string }[];
  hrefs: string[];
}

export interface IplanPagePayload {
  id: string;
  date: string;
  quick: PageDump;
  cloud: PageDump | null;
}

function valueAfter(lines: string[], label: string): string | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === label || line === `${label}:`) return lines[i + 1] ?? null;
    if (line.startsWith(`${label}:`) && line.length > label.length + 1) return line.slice(label.length + 1).trim();
  }
  return null;
}

function toInt(value: string | null | undefined): number | null {
  const match = String(value ?? "").match(/-?\d+/);
  return match ? Number(match[0]) : null;
}

export interface QuickView {
  typeLabel: string | null;
  title: string | null;
  status: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  staff: { name: string; role: string }[];
  cloudId: string | null;
}

const STATUSES = ["סגור", "פתוח", "בתהליך סגירה", "פוטנציאלי"];

export function parseQuickView(dump: PageDump): QuickView {
  const { lines } = dump;
  const dateIndex = lines.findIndex((line) => /^\d{2}\/\d{2}\/\d{4}$/.test(line));
  const [d, m, y] = dateIndex >= 0 ? lines[dateIndex].split("/") : [];
  const startLine = dateIndex >= 0 ? lines[dateIndex + 1] : null;
  const endLine = dateIndex >= 0 ? lines[dateIndex + 2] : null;
  const cloud = dump.hrefs.map((href) => href.match(/client\/events\/(\d+)(?:$|\?)/)).find(Boolean);

  return {
    typeLabel: lines[1] || null,
    title: lines[2] || null,
    status: lines.find((line) => STATUSES.includes(line)) ?? null,
    date: y ? `${y}-${m}-${d}` : null,
    startTime: /^\d{1,2}:\d{2}$/.test(startLine ?? "") ? startLine : null,
    endTime: (endLine ?? "").match(/(\d{1,2}:\d{2})/)?.[1] ?? null,
    staff: dump.labels,
    cloudId: cloud ? cloud[1] : null,
  };
}

export interface CloudView {
  users: { name: string; role: string; phone: string | null; email: string | null }[];
  commitmentReceived: boolean;
  serviceStyle: string | null;
  guestsSecure: number | null;
  guestsReserve: number | null;
  reservePercent: number | null;
  minimumGuests: number | null;
  kids: number | null;
  glat: number | null;
  vegetarian: number | null;
  vegan: number | null;
  glutenFree: number | null;
  toddlers: number | null;
  isReverse: boolean;
}

const COMMITMENT_HEADING = "התחייבות חתומה";

export function parseCloud(dump: PageDump | null): CloudView {
  const lines = dump?.lines ?? [];

  const users: CloudView["users"] = [];
  const usersAt = lines.indexOf("משתמשים באירוע");
  if (usersAt >= 0) {
    const end = lines.findIndex((line, i) => i > usersAt && line === "הוספה");
    const block = lines.slice(usersAt + 1, end > 0 ? end : usersAt + 40);
    for (let i = 0; i < block.length; i++) {
      if (block[i + 1] === "חתן" || block[i + 1] === "כלה") {
        const user = { name: block[i], role: block[i + 1], phone: null as string | null, email: null as string | null };
        for (let j = i + 2; j < Math.min(block.length, i + 8); j++) {
          if (/^[\d-]{9,}$/.test(block[j]) && !user.phone) user.phone = block[j];
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(block[j]) && !user.email) user.email = block[j];
        }
        users.push(user);
      }
    }
  }

  // The heading line sometimes carries the status itself ("התחייבות חתומה
  // התקבלה") and sometimes the status is on the following lines ("סטטוס:" /
  // "לא התקבלה") - read both, then check it isn't the negative form.
  const commitmentAt = lines.findIndex((line) => line.startsWith(COMMITMENT_HEADING));
  const after = commitmentAt >= 0 ? lines.slice(commitmentAt + 1) : [];
  const statusText =
    commitmentAt >= 0 ? [lines[commitmentAt].slice(COMMITMENT_HEADING.length), ...after.slice(0, 3)].join(" ") : "";
  const received = /(^|\s)התקבלה/.test(statusText) && !/לא התקבלה/.test(statusText);
  const get = (label: string) => toInt(valueAfter(after, label));

  return {
    users,
    commitmentReceived: received,
    serviceStyle: valueAfter(after, "סוג הגשה"),
    guestsSecure: received ? get("אורחים בטוחים") : null,
    guestsReserve: received ? get("אורחים רזרבה") : null,
    reservePercent: toInt(valueAfter(after, "% רזרבה מקסימלי")),
    // The contract minimum, shown while no signed commitment has arrived.
    minimumGuests: toInt(valueAfter(lines, "מינימום אורחים")),
    kids: received ? get("מנות ילדים") : null,
    glat: received ? get("מנות גלאט") : null,
    vegetarian: received ? get("מנות צמחוניות") : null,
    vegan: received ? get("מנות טבעוניות") : null,
    glutenFree: received ? get("מנות ללא גלוטן") : null,
    toddlers: received ? get("ילדים מתחת לגיל 2") : null,
    isReverse: lines.some((line) => line.includes('לו"ז אירוע') && line.includes("הפוכה")),
  };
}

// The venue only runs the "reverse" wedding format on Fridays, and iPlan marks
// it only through the schedule form attached to the event - so a Friday
// wedding counts as reverse even before that form exists.
export function mapEventType(
  typeLabel: string | null,
  serviceStyle: string | null,
  isReverse: boolean,
  isoDate: string | null,
): GeminiExtraction["event_type"] {
  const label = typeLabel ?? "";
  if (label.includes("חתונה")) {
    const service = serviceStyle === "הגשה";
    if (isReverse || (isoDate && isFriday(isoDate))) return service ? "reverse_wedding_service" : "reverse_wedding";
    return service ? "wedding_service" : "wedding";
  }
  if (label.includes("בר מצווה")) return "bar_mitzvah";
  if (label.includes("בת מצווה")) return "bat_mitzvah";
  if (label.includes("עסקי")) return "business_event";
  return "other";
}

// Same shape the screenshot import reads off iPlan's event screen.
export function buildIplanPayload(page: IplanPagePayload): IplanEventPayload {
  const quick = parseQuickView(page.quick);
  const cloud = parseCloud(page.cloud);
  const bride = cloud.users.find((user) => user.role === "כלה") ?? null;
  const groom = cloud.users.find((user) => user.role === "חתן") ?? null;
  const isWedding = (quick.typeLabel ?? "").includes("חתונה") && !!(bride || groom);
  const staffByRole = (role: string) => quick.staff.find((member) => member.role === role)?.name ?? null;
  const contacts = [bride, groom].filter((user): user is NonNullable<typeof user> => !!user);
  // "עדיין לא נקבע" (not decided yet) is not a style.
  const style = cloud.serviceStyle === "מזנונים" || cloud.serviceStyle === "הגשה" ? cloud.serviceStyle : null;

  return {
    iplan_event_id: page.id,
    confirmed: quick.status === "סגור",
    title: quick.title,
    floor_manager_name: staffByRole("מנהל פלור"),
    extraction: {
      bride_name: isWedding ? (bride?.name ?? null) : quick.title,
      groom_name: isWedding ? (groom?.name ?? null) : null,
      event_type: mapEventType(quick.typeLabel, style, cloud.isReverse, quick.date),
      event_date: quick.date,
      start_time: quick.startTime,
      end_time: quick.endTime,
      event_manager_name: staffByRole("מנהל אירוע"),
      sales_person_name: staffByRole("מכירות"),
      service_style: style,
      contact_phone: contacts[0]?.phone ?? null,
      contact_phone_2: contacts[1]?.phone ?? null,
      contact_email: contacts[0]?.email ?? null,
      contact_email_2: contacts[1]?.email ?? null,
      // Until the client signs a commitment the number in use is the contract
      // minimum (what is entered by hand today) - without a reserve on top.
      guests_secure: cloud.commitmentReceived ? cloud.guestsSecure : cloud.minimumGuests,
      guests_reserve: cloud.guestsReserve,
      guests_reserve_percent: cloud.commitmentReceived && cloud.guestsReserve == null ? cloud.reservePercent : null,
      kids_meals: cloud.kids,
      glat_meals: cloud.glat,
      vegetarian_meals: cloud.vegetarian,
      vegan_meals: cloud.vegan,
      gluten_free_meals: cloud.glutenFree,
      toddlers_under_2: cloud.toddlers,
      source_type: "iplan_screen",
    },
  };
}

export function isIplanPagePayload(value: unknown): value is IplanPagePayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const dump = (x: unknown) => !!x && typeof x === "object" && Array.isArray((x as PageDump).lines);
  return typeof v.id === "string" && typeof v.date === "string" && dump(v.quick) && (v.cloud === null || dump(v.cloud));
}
