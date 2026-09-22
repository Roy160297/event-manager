import { describe, expect, it } from "vitest";
import { buildWelcomeEmailBody, welcomeEmailAttachmentAssetFor } from "@/lib/welcomeEmail";

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

describe("welcomeEmailAttachmentAssetFor", () => {
  it("picks the manager-specific PDF when one exists", () => {
    expect(welcomeEmailAttachmentAssetFor("ניר חדד")).toBe("wedding-welcome-guidelines-nir-hadad.pdf");
    expect(welcomeEmailAttachmentAssetFor("רן קופרמן")).toBe("wedding-welcome-guidelines-ran-kuperman.pdf");
  });

  it("falls back to the default PDF for a manager without their own version", () => {
    expect(welcomeEmailAttachmentAssetFor("רועי פוריאן")).toBe("wedding-welcome-guidelines.pdf");
    expect(welcomeEmailAttachmentAssetFor("דנה כהן")).toBe("wedding-welcome-guidelines.pdf");
    expect(welcomeEmailAttachmentAssetFor(null)).toBe("wedding-welcome-guidelines.pdf");
  });
});
