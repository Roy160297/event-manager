import { describe, expect, it } from "vitest";
import { buildWelcomeEmailBody } from "@/lib/welcomeEmail";

describe("buildWelcomeEmailBody", () => {
  it("signs off with the manager's name and phone when a phone is available", () => {
    const body = buildWelcomeEmailBody("רועי פוריאן", "0525850434");
    expect(body).toContain("נעים מאוד, רועי פוריאן 😊");
    expect(body.trim().endsWith("רועי פוריאן, 0525850434")).toBe(true);
  });

  it("signs off with just the name when no phone is available", () => {
    const body = buildWelcomeEmailBody("דנה כהן", null);
    expect(body).toContain("נעים מאוד, דנה כהן 😊");
    expect(body.trim().endsWith("דנה כהן")).toBe(true);
    expect(body).not.toContain("null");
  });
});
