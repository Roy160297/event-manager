import { describe, expect, it } from "vitest";
import { israelHour, jitterMinutes, shouldRunSync } from "@/lib/iplanSchedule";

const base = { intervalMinutes: 180, activeFromHour: 7, activeToHour: 22, runRequestedAt: null };
// 10:00 Israel (UTC+3 in October)
const at = (iso: string) => new Date(iso);

describe("israelHour", () => {
  it("converts to Israel time", () => {
    expect(israelHour(at("2026-10-10T07:00:00Z"))).toBe(10);
    expect(israelHour(at("2026-10-10T21:30:00Z"))).toBe(0);
  });
});

describe("shouldRunSync", () => {
  it("runs right away when it has never run", () => {
    expect(shouldRunSync({ ...base, now: at("2026-10-10T07:00:00Z"), lastRunAt: null })).toEqual({ run: true, force: false });
  });

  it("waits out the interval plus the jitter", () => {
    const lastRunAt = at("2026-10-10T05:00:00Z");
    const wait = 180 + jitterMinutes(lastRunAt);
    const justBefore = new Date(lastRunAt.getTime() + (wait - 1) * 60000);
    const justAfter = new Date(lastRunAt.getTime() + wait * 60000);
    expect(shouldRunSync({ ...base, now: justBefore, lastRunAt }).run).toBe(false);
    expect(shouldRunSync({ ...base, now: justAfter, lastRunAt }).run).toBe(true);
  });

  it("stays quiet outside the active hours", () => {
    const lastRunAt = at("2026-10-09T10:00:00Z");
    expect(shouldRunSync({ ...base, now: at("2026-10-10T01:00:00Z"), lastRunAt })).toEqual({ run: false, force: false });
    expect(shouldRunSync({ ...base, now: at("2026-10-10T08:00:00Z"), lastRunAt }).run).toBe(true);
  });

  it("in daily mode runs once per day, in the morning window", () => {
    const daily = { ...base, intervalMinutes: 1440, activeFromHour: 8 };
    const yesterday = at("2026-10-09T06:00:00Z"); // 09:00 Israel, yesterday
    // 07:30 Israel: before the window opens
    expect(shouldRunSync({ ...daily, now: at("2026-10-10T04:30:00Z"), lastRunAt: yesterday }).run).toBe(false);
    // 09:00 Israel: window open (jitter is under 21 minutes)
    expect(shouldRunSync({ ...daily, now: at("2026-10-10T06:00:00Z"), lastRunAt: yesterday }).run).toBe(true);
    // already ran today
    expect(shouldRunSync({ ...daily, now: at("2026-10-10T12:00:00Z"), lastRunAt: at("2026-10-10T06:00:00Z") }).run).toBe(false);
  });

  it("runs a requested sync at once, even at night", () => {
    const lastRunAt = at("2026-10-10T20:00:00Z");
    const runRequestedAt = at("2026-10-10T21:00:00Z");
    expect(shouldRunSync({ ...base, now: at("2026-10-10T21:05:00Z"), lastRunAt, runRequestedAt })).toEqual({ run: true, force: true });
  });

  it("does not repeat a request that was already served", () => {
    const runRequestedAt = at("2026-10-10T08:00:00Z");
    const lastRunAt = at("2026-10-10T08:10:00Z");
    expect(shouldRunSync({ ...base, now: at("2026-10-10T08:20:00Z"), lastRunAt, runRequestedAt })).toEqual({ run: false, force: false });
  });
});
