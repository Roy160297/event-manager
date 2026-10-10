import { describe, expect, it } from "vitest";
import type { GeminiExtraction } from "@/lib/imageImport";
import {
  describeChanges,
  diffSnapshots,
  eventInsertFromSnapshot,
  eventUpdateForChanges,
  isIplanEventPayload,
  matchStaffByName,
  mergeSnapshot,
  snapshotFromPayload,
  type IplanEventPayload,
} from "@/lib/iplanSync";

const extraction = (overrides: Partial<GeminiExtraction> = {}): GeminiExtraction => ({
  bride_name: "מאיה ברק",
  groom_name: "דניאל רז",
  event_type: "wedding",
  event_date: "2026-10-15",
  start_time: "19:30",
  end_time: null,
  event_manager_name: "מיכל דורון",
  sales_person_name: "דנה אברמוב",
  service_style: null,
  contact_phone: "050-1111111",
  contact_phone_2: null,
  contact_email: null,
  contact_email_2: null,
  guests_secure: 200,
  guests_reserve: 14,
  guests_reserve_percent: null,
  kids_meals: null,
  glat_meals: null,
  vegetarian_meals: null,
  vegan_meals: null,
  gluten_free_meals: null,
  toddlers_under_2: null,
  source_type: "iplan_screen",
  ...overrides,
});

const payload = (overrides: Partial<GeminiExtraction> = {}, floor: string | null = null): IplanEventPayload => ({
  iplan_event_id: "123",
  confirmed: true,
  extraction: extraction(overrides),
  floor_manager_name: floor,
});

const staff = [
  { id: "m", name: "מיכל דורון" },
  { id: "f", name: "רון אבני" },
  { id: "s", name: "דנה אברמוב" },
];

describe("snapshotFromPayload", () => {
  it("uses the shared guest-count rules and joins the couple's names", () => {
    const snapshot = snapshotFromPayload(payload());
    expect(snapshot.name).toBe("מאיה ברק ודניאל רז");
    expect(snapshot.estimated_guests).toBe("200+14");
  });
});

describe("diffSnapshots", () => {
  it("reports nothing for the first snapshot or an unchanged one", () => {
    const snapshot = snapshotFromPayload(payload());
    expect(diffSnapshots(null, snapshot)).toEqual([]);
    expect(diffSnapshots(snapshot, snapshotFromPayload(payload()))).toEqual([]);
  });

  it("reports a changed commitment with before and after", () => {
    const before = snapshotFromPayload(payload());
    const after = snapshotFromPayload(payload({ guests_secure: 210 }));
    const changes = diffSnapshots(before, after);
    expect(changes).toEqual([{ field: "estimated_guests", label: "מספר אורחים - התחייבות", from: "200+14", to: "210+14" }]);
    expect(describeChanges(changes)).toBe("מספר אורחים - התחייבות: 200+14 ← 210+14");
  });

  it("treats 19:30 and 19:30:00 as the same time", () => {
    const before = { ...snapshotFromPayload(payload()), start_time: "19:30:00" };
    expect(diffSnapshots(before, snapshotFromPayload(payload()))).toEqual([]);
  });
});

describe("mergeSnapshot", () => {
  it("keeps the previous value for a field iPlan returned empty", () => {
    const before = snapshotFromPayload(payload());
    const unreadable = snapshotFromPayload(payload({ guests_secure: null, guests_reserve: null, contact_phone: null }));
    const merged = mergeSnapshot(before, unreadable);
    expect(merged.estimated_guests).toBe("200+14");
    expect(merged.contact_phone).toBe("050-1111111");
    expect(diffSnapshots(before, merged)).toEqual([]);
  });

  it("uses the new snapshot as is when there is no previous one", () => {
    const next = snapshotFromPayload(payload());
    expect(mergeSnapshot(null, next)).toBe(next);
  });
});

describe("eventUpdateForChanges", () => {
  it("writes only the changed fields, resolving staff names to ids", () => {
    const before = snapshotFromPayload(payload());
    const after = snapshotFromPayload(payload({ guests_secure: 210, event_manager_name: "רון אבני" }));
    const { update, warnings } = eventUpdateForChanges(diffSnapshots(before, after), after, staff);
    expect(update).toEqual({ estimated_guests: "210+14", manager_id: "f" });
    expect(warnings).toEqual([]);
  });

  it("keeps the current assignment and warns when a new staff name is unknown", () => {
    const before = snapshotFromPayload(payload());
    const after = snapshotFromPayload(payload({ event_manager_name: "מישהו חדש" }));
    const { update, warnings } = eventUpdateForChanges(diffSnapshots(before, after), after, staff);
    expect(update).toEqual({});
    expect(warnings).toHaveLength(1);
  });

  it("picks up a floor manager that appears later", () => {
    const before = snapshotFromPayload(payload());
    const after = snapshotFromPayload(payload({}, "רון אבני"));
    const { update } = eventUpdateForChanges(diffSnapshots(before, after), after, staff);
    expect(update).toEqual({ floor_manager_id: "f" });
  });
});

describe("eventInsertFromSnapshot", () => {
  it("fills default times and links staff by name", () => {
    const insert = eventInsertFromSnapshot(snapshotFromPayload(payload({ start_time: null }, "רון אבני")), staff);
    expect(insert).toMatchObject({
      name: "מאיה ברק ודניאל רז",
      event_date: "2026-10-15",
      start_time: "19:30",
      end_time: "03:00",
      manager_id: "m",
      floor_manager_id: "f",
      sales_person_id: "s",
      estimated_guests: "200+14",
    });
  });
});

describe("isIplanEventPayload", () => {
  it("accepts a well-formed payload and rejects junk", () => {
    expect(isIplanEventPayload(payload())).toBe(true);
    expect(isIplanEventPayload({ iplan_event_id: "", confirmed: true, extraction: {} })).toBe(false);
    expect(isIplanEventPayload(null)).toBe(false);
  });
});

describe("matchStaffByName", () => {
  const team = [
    { id: "e", name: "אווה" },
    { id: "r", name: "רן קופרמן" },
    { id: "r2", name: "רן" },
  ];
  it("matches exact names first", () => {
    expect(matchStaffByName(team, "רן קופרמן")).toBe("r");
    expect(matchStaffByName(team, "  רן ")).toBe("r2");
  });
  it("matches a first name against iPlan's full name", () => {
    expect(matchStaffByName(team, "אווה בוגדשובה")).toBe("e");
  });
  it("refuses an ambiguous or unknown name", () => {
    expect(matchStaffByName(team, "רן כהן")).toBe("r2");
    expect(matchStaffByName([{ id: "a", name: "דן" }, { id: "b", name: "דן כהן" }], "דן כהן לוי")).toBeNull();
    expect(matchStaffByName(team, "מישהו")).toBeNull();
  });
});
