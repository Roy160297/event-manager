import { describe, expect, it } from "vitest";
import { assembleGuides } from "@/lib/guides";

describe("assembleGuides", () => {
  it("orders pages, sections and items by sort_order and keeps each item under its own section", () => {
    const guides = assembleGuides(
      [
        { key: "b", title: "B", intro: "", sort_order: 20 },
        { key: "a", title: "A", intro: "intro", sort_order: 10 },
      ],
      [
        { id: "s2", page_key: "a", label: "second", sort_order: 20 },
        { id: "s1", page_key: "a", label: "first", sort_order: 10 },
        { id: "s3", page_key: "b", label: "other page", sort_order: 10 },
      ],
      [
        { id: "i2", section_id: "s1", text: "two", sort_order: 20 },
        { id: "i1", section_id: "s1", text: "one", sort_order: 10 },
        { id: "i3", section_id: "s2", text: "three", sort_order: 10 },
        { id: "i4", section_id: "s3", text: "four", sort_order: 10 },
      ],
    );

    expect(guides.map((guide) => guide.key)).toEqual(["a", "b"]);
    expect(guides[0].intro).toBe("intro");
    expect(guides[0].sections.map((section) => section.label)).toEqual(["first", "second"]);
    expect(guides[0].sections[0].items.map((item) => item.text)).toEqual(["one", "two"]);
    expect(guides[0].sections[1].items.map((item) => item.text)).toEqual(["three"]);
    expect(guides[1].sections[0].items.map((item) => item.text)).toEqual(["four"]);
  });

  it("returns a page with no sections when none exist", () => {
    expect(assembleGuides([{ key: "a", title: "A", intro: "", sort_order: 1 }], [], [])[0].sections).toEqual([]);
  });
});
