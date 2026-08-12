import { describe, expect, it } from "vitest";
import { buildImageImportDraft, type GeminiExtraction } from "@/lib/imageImport";

const BASE_EXTRACTION: GeminiExtraction = {
  bride_name: "מאיה",
  groom_name: "טל",
  event_type: "wedding",
  event_date: "2026-06-01",
  start_time: "19:00",
  end_time: "23:00",
  event_manager_name: null,
  sales_person_name: null,
  service_style: null,
  contact_phone: null,
  contact_phone_2: null,
  contact_email: null,
  contact_email_2: null,
  guests_secure: null,
  guests_reserve: null,
  guests_reserve_percent: null,
  kids_meals: null,
  glat_meals: null,
  vegetarian_meals: null,
  vegan_meals: null,
  gluten_free_meals: null,
  toddlers_under_2: null,
};

describe("buildImageImportDraft - guest count derivation", () => {
  it("sums guests_secure + all four meal-type headcounts into totalSecure, with a direct reserve number", () => {
    const draft = buildImageImportDraft({
      ...BASE_EXTRACTION,
      guests_secure: 200,
      glat_meals: 10,
      vegetarian_meals: 8,
      vegan_meals: 2,
      gluten_free_meals: 2,
      guests_reserve: 15,
    });
    // 200 + 10 + 8 + 2 + 2 = 222
    expect(draft.estimated_guests).toBe("222+15");
  });

  it("rounds a percent-based reserve UP, never down (5% of 270 -> 14, not 13)", () => {
    const draft = buildImageImportDraft({
      ...BASE_EXTRACTION,
      guests_secure: 270,
      guests_reserve_percent: 5,
    });
    expect(draft.estimated_guests).toBe("270+14");
  });

  it("prefers a direct guests_reserve number over guests_reserve_percent when both are somehow present", () => {
    const draft = buildImageImportDraft({
      ...BASE_EXTRACTION,
      guests_secure: 100,
      guests_reserve: 7,
      guests_reserve_percent: 50,
    });
    expect(draft.estimated_guests).toBe("100+7");
  });

  it("omits the reserve half entirely when no reserve data of either kind is present", () => {
    const draft = buildImageImportDraft({
      ...BASE_EXTRACTION,
      guests_secure: 150,
    });
    expect(draft.estimated_guests).toBe("150");
  });

  it("warns and leaves estimated_guests null when guests_secure itself is missing", () => {
    const draft = buildImageImportDraft({ ...BASE_EXTRACTION, guests_reserve: 10 });
    expect(draft.estimated_guests).toBeNull();
    expect(draft.warnings.some((w) => w.includes("התחייבות אורחים"))).toBe(true);
  });
});

describe("buildImageImportDraft - diet-type meal counts", () => {
  it("renders an explicit 0 meal count as blank (null), not the string '0'", () => {
    const draft = buildImageImportDraft({
      ...BASE_EXTRACTION,
      glat_meals: 0,
      vegetarian_meals: 0,
      vegan_meals: 0,
      gluten_free_meals: 0,
    });
    expect(draft.glat_meal_count).toBeNull();
    expect(draft.vegetarian_meal_count).toBeNull();
    expect(draft.vegan_meal_count).toBeNull();
    expect(draft.gluten_free_meal_count).toBeNull();
  });

  it("still renders a real positive meal count as a string", () => {
    const draft = buildImageImportDraft({ ...BASE_EXTRACTION, glat_meals: 12 });
    expect(draft.glat_meal_count).toBe("12");
  });

  it("keeps an explicit 0 for kids/toddlers headcounts, unlike the diet-type fields", () => {
    const draft = buildImageImportDraft({ ...BASE_EXTRACTION, kids_meals: 0, toddlers_under_2: 0 });
    expect(draft.kids_meal_count).toBe("0");
    expect(draft.toddlers_under_2_count).toBe("0");
  });
});
