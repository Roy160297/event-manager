import { describe, expect, it } from "vitest";
import { buildIplanPayload, isIplanPagePayload, mapEventType, parseCloud, parseQuickView, type PageDump } from "@/lib/iplanPages";

const quick: PageDump = {
  lines: [
    "יום חמישי, 15 אוקטובר 2026",
    "חתונה",
    "מיקה קלר ויובל רביב - מפיק כלשהו",
    "סגור",
    "House No.Seven",
    "חתונה",
    "15/10/2026",
    "19:30",
    "- 03:00",
    "כרטיס אירוע",
    "מינימום אורחים",
    "320",
    "צוות מטפל באירוע",
  ],
  labels: [
    { name: "אסף רמתי", role: "מכירות" },
    { name: "רן קופרמן", role: "מנהל אירוע" },
    { name: "אווה בוגדשובה", role: "מנהל פלור" },
  ],
  hrefs: ["/he-IL/corp/companies/42/company_events/2342784", "/he-IL/corp/companies/42/client/events/268277"],
};

const cloudNotReceived: PageDump = {
  lines: [
    "קוד אירוע",
    "משתמשים באירוע",
    "יובל רביב",
    "חתן",
    "כניסה אחרונה לאירוע",
    "052-578-4756",
    "yuval@example.com",
    "מיקה קלר",
    "כלה",
    "054-459-0103",
    "mika@example.com",
    "הוספה",
    "טפסים שלי",
    'לו"ז אירוע - חתונה הפוכה',
    "התחייבות חתומה",
    "סטטוס:",
    "לא התקבלה",
    "מינימום אורחים:",
    "320",
    "% רזרבה מקסימלי:",
    "5",
    "סוג הגשה:",
    "מזנונים",
  ],
  labels: [],
  hrefs: [],
};

const cloudReceived: PageDump = {
  lines: [
    "משתמשים באירוע",
    "לאה רשתוניק",
    "כלה",
    "ניב ברקוביץ'",
    "חתן",
    "הוספה",
    "התחייבות חתומה התקבלה",
    "סוג הגשה:",
    "מזנונים",
    "אורחים בטוחים:",
    "258",
    "אורחים רזרבה:",
    "13",
    "מנות ילדים:",
    "14",
    "מנות גלאט:",
    "2",
    "מנות צמחוניות:",
    "0",
    "ילדים מתחת לגיל 2:",
    "2",
    "נעילות",
  ],
  labels: [],
  hrefs: [],
};

describe("parseQuickView", () => {
  it("reads type, title, status, date, times, staff and the cloud page id", () => {
    expect(parseQuickView(quick)).toMatchObject({
      typeLabel: "חתונה",
      title: "מיקה קלר ויובל רביב - מפיק כלשהו",
      status: "סגור",
      date: "2026-10-15",
      startTime: "19:30",
      endTime: "03:00",
      cloudId: "268277",
    });
    expect(parseQuickView(quick).staff).toHaveLength(3);
  });
});

describe("parseCloud", () => {
  it("reads the couple, the contract minimum and the reverse-wedding form while no commitment arrived", () => {
    const cloud = parseCloud(cloudNotReceived);
    expect(cloud.commitmentReceived).toBe(false);
    expect(cloud.minimumGuests).toBe(320);
    expect(cloud.reservePercent).toBe(5);
    expect(cloud.guestsSecure).toBeNull();
    expect(cloud.isReverse).toBe(true);
    expect(cloud.users.map((user) => [user.name, user.role, user.phone, user.email])).toEqual([
      ["יובל רביב", "חתן", "052-578-4756", "yuval@example.com"],
      ["מיקה קלר", "כלה", "054-459-0103", "mika@example.com"],
    ]);
  });

  it("reads a received commitment even when the status sits on the heading line", () => {
    const cloud = parseCloud(cloudReceived);
    expect(cloud).toMatchObject({
      commitmentReceived: true,
      guestsSecure: 258,
      guestsReserve: 13,
      kids: 14,
      glat: 2,
      vegetarian: 0,
      toddlers: 2,
      serviceStyle: "מזנונים",
    });
  });

  it("copes with a page that has no commitment box at all", () => {
    expect(parseCloud(null).commitmentReceived).toBe(false);
    expect(parseCloud({ lines: ["כלום"], labels: [], hrefs: [] }).minimumGuests).toBeNull();
  });
});

describe("mapEventType", () => {
  it("maps weddings by service style, reverse form and Friday", () => {
    expect(mapEventType("חתונה", "מזנונים", false, "2026-10-14")).toBe("wedding");
    expect(mapEventType("חתונה", "הגשה", false, "2026-10-14")).toBe("wedding_service");
    expect(mapEventType("חתונה", "מזנונים", true, "2026-10-14")).toBe("reverse_wedding");
    expect(mapEventType("חתונה", "הגשה", false, "2026-10-16")).toBe("reverse_wedding_service");
  });
  it("maps the other kinds", () => {
    expect(mapEventType("אירוע עסקי", null, false, "2026-10-14")).toBe("business_event");
    expect(mapEventType("בת מצווה", null, false, "2026-10-14")).toBe("bat_mitzvah");
    expect(mapEventType("משהו אחר", null, false, null)).toBe("other");
  });
});

describe("buildIplanPayload", () => {
  it("uses the contract minimum before a commitment and takes the staff from their roles", () => {
    const payload = buildIplanPayload({ id: "2342784", date: "2026-10-15", quick, cloud: cloudNotReceived });
    expect(payload.confirmed).toBe(true);
    expect(payload.floor_manager_name).toBe("אווה בוגדשובה");
    expect(payload.extraction).toMatchObject({
      event_type: "reverse_wedding",
      event_manager_name: "רן קופרמן",
      sales_person_name: "אסף רמתי",
      guests_secure: 320,
      guests_reserve: null,
      guests_reserve_percent: null,
      contact_phone: "054-459-0103",
    });
  });

  it("uses the signed commitment with its reserve and meal counts once received", () => {
    const payload = buildIplanPayload({ id: "1", date: "2026-10-15", quick, cloud: cloudReceived });
    expect(payload.extraction).toMatchObject({ guests_secure: 258, guests_reserve: 13, kids_meals: 14, glat_meals: 2 });
  });
});

describe("isIplanPagePayload", () => {
  it("accepts dumps and rejects junk", () => {
    expect(isIplanPagePayload({ id: "1", date: "2026-10-15", quick, cloud: null })).toBe(true);
    expect(isIplanPagePayload({ id: "1", date: "2026-10-15", quick: {}, cloud: null })).toBe(false);
    expect(isIplanPagePayload(null)).toBe(false);
  });
});
