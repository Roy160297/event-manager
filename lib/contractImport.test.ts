import { describe, expect, it } from "vitest";
import { buildContractDraft, type ContractExtraction } from "./contractImport";

const base: ContractExtraction = {
  client_1_name: "אלמוג כהן",
  client_2_name: "טאי לוי",
  event_type: "wedding",
  event_date: "2027-08-04",
  start_time: "19:00",
  start_time_alt: null,
  hall_name: "בית",
  estimated_guests: "240",
  client_1_phone: "052-637-1418",
  client_2_phone: "+972 52-684-6630",
  client_1_email: " Almog@Gmail.com ",
  client_2_email: null,
};

describe("buildContractDraft", () => {
  it("joins the two client names with a Hebrew vav", () => {
    expect(buildContractDraft(base).name).toBe("אלמוג כהן וטאי לוי");
  });

  it("uses the single name when there is only one client", () => {
    expect(buildContractDraft({ ...base, client_2_name: null }).name).toBe("אלמוג כהן");
  });

  it("falls back to a wedding for a missing or unknown event type", () => {
    expect(buildContractDraft({ ...base, event_type: null }).event_type).toBe("wedding");
    expect(buildContractDraft({ ...base, event_type: "birthday" as never }).event_type).toBe("wedding");
  });

  it("keeps a valid private event type", () => {
    expect(buildContractDraft({ ...base, event_type: "bar_mitzvah" }).event_type).toBe("bar_mitzvah");
  });

  it("normalises phones and lower-cases e-mails", () => {
    const draft = buildContractDraft(base);
    expect(draft.contact_phone).toBe("052-637-1418");
    expect(draft.contact_phone_2).toBe("0526846630");
    expect(draft.contact_email).toBe("almog@gmail.com");
    expect(draft.contact_email_2).toBeNull();
  });

  it("keeps digits only for the guest count", () => {
    expect(buildContractDraft({ ...base, estimated_guests: " 240 אורחים" }).estimated_guests).toBe("240");
  });

  it("keeps the date as read, with no day/month warning", () => {
    const draft = buildContractDraft({ ...base, event_date: "2027-04-08" });
    expect(draft.event_date).toBe("2027-04-08");
    expect(draft.warnings.some((w) => w.includes("יום/חודש"))).toBe(false);
  });

  it("rejects an impossible date and warns that it is missing", () => {
    const draft = buildContractDraft({ ...base, event_date: "2027-02-31" });
    expect(draft.event_date).toBeNull();
    expect(draft.warnings.some((w) => w.includes("תאריך האירוע"))).toBe(true);
  });

  it("rejects a malformed time", () => {
    expect(buildContractDraft({ ...base, start_time: "25:99" }).start_time).toBeNull();
    expect(buildContractDraft({ ...base, start_time: "7.5" }).start_time).toBeNull();
  });

  it("pads a single-digit hour", () => {
    expect(buildContractDraft({ ...base, start_time: "9:30" }).start_time).toBe("09:30");
  });

  it("warns when two different start times were written", () => {
    const draft = buildContractDraft({ ...base, start_time_alt: "18:30" });
    expect(draft.start_time).toBe("19:00");
    expect(draft.warnings.some((w) => w.includes("19:00 / 18:30"))).toBe(true);
  });

  it("does not warn about a second time that matches the first", () => {
    const draft = buildContractDraft({ ...base, start_time_alt: "19:00" });
    expect(draft.warnings.some((w) => w.includes("שתי שעות"))).toBe(false);
  });

  it("warns when no names were read", () => {
    const draft = buildContractDraft({ ...base, client_1_name: null, client_2_name: null });
    expect(draft.name).toBe("");
    expect(draft.warnings.some((w) => w.includes("שמות הלקוחות"))).toBe(true);
  });
});
