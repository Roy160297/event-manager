import { describe, expect, it } from "vitest";
import { appliesToEventType, assembleChecklists, countItems, itemKeysOf } from "@/lib/checklists";

const checklist = (key: string, sort_order: number, extra: Partial<Parameters<typeof assembleChecklists>[0][number]> = {}) => ({
  key,
  label: key,
  note_label: null,
  event_types: null,
  show_category_labels: false,
  include_in_email: false,
  requires_manager_cosign: false,
  is_system: false,
  sort_order,
  ...extra,
});

describe("assembleChecklists", () => {
  it("orders checklists, categories and items by sort_order", () => {
    const result = assembleChecklists(
      [checklist("b", 20), checklist("a", 10)],
      [
        { id: "c2", checklist_key: "a", key: "second", label: "Second", sort_order: 20 },
        { id: "c1", checklist_key: "a", key: "first", label: "First", sort_order: 10 },
      ],
      [
        { category_id: "c1", key: "i2", text: "two", sort_order: 20 },
        { category_id: "c1", key: "i1", text: "one", sort_order: 10 },
        { category_id: "c2", key: "i3", text: "three", sort_order: 10 },
      ],
    );

    expect(result.map((entry) => entry.key)).toEqual(["a", "b"]);
    expect(result[0].categories.map((category) => category.key)).toEqual(["first", "second"]);
    expect(result[0].categories[0].items.map((item) => item.key)).toEqual(["i1", "i2"]);
    expect(result[1].categories).toEqual([]);
  });

  it("maps the database flags to the definition", () => {
    const [definition] = assembleChecklists(
      [
        checklist("x", 10, {
          note_label: "הערות",
          event_types: ["business_event"],
          show_category_labels: true,
          include_in_email: true,
          requires_manager_cosign: true,
          is_system: true,
        }),
      ],
      [],
      [],
    );
    expect(definition).toMatchObject({
      noteLabel: "הערות",
      eventTypes: ["business_event"],
      showCategoryLabels: true,
      includeInEmail: true,
      requiresManagerCosign: true,
      isSystem: true,
    });
  });

  it("does not mix items between categories of different checklists", () => {
    const result = assembleChecklists(
      [checklist("a", 10), checklist("b", 20)],
      [
        { id: "ca", checklist_key: "a", key: "main", label: "Main", sort_order: 10 },
        { id: "cb", checklist_key: "b", key: "main", label: "Main", sort_order: 10 },
      ],
      [
        { category_id: "ca", key: "only-a", text: "a", sort_order: 10 },
        { category_id: "cb", key: "only-b", text: "b", sort_order: 10 },
      ],
    );
    expect(itemKeysOf(result[0])).toEqual(["only-a"]);
    expect(itemKeysOf(result[1])).toEqual(["only-b"]);
    expect(countItems(result[1].categories)).toBe(1);
  });
});

describe("appliesToEventType", () => {
  it("applies to every type when no types are set", () => {
    expect(appliesToEventType({ eventTypes: null }, "wedding")).toBe(true);
    expect(appliesToEventType({ eventTypes: null }, null)).toBe(true);
  });

  it("applies only to the listed types otherwise", () => {
    expect(appliesToEventType({ eventTypes: ["business_event"] }, "business_event")).toBe(true);
    expect(appliesToEventType({ eventTypes: ["business_event"] }, "wedding")).toBe(false);
    expect(appliesToEventType({ eventTypes: ["business_event"] }, null)).toBe(false);
  });
});
