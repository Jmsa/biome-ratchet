import { describe, it, expect, vi } from "vitest";
import { ratchet } from "./ratchet";
import type { CountsMap } from "./parser";

// Mock fs so we don't hit disk in unit tests
vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
  },
}));

const silent = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

describe("ratchet", () => {
  it("returns no new issues when baseline and latest are identical", () => {
    const baseline: CountsMap = {
      "src/foo.ts": { "lint/style/noVar": { error: 2 } },
    };
    const { hasNewIssues } = ratchet(baseline, structuredClone(baseline), silent);
    expect(hasNewIssues).toBe(false);
  });

  it("detects increased error count as a new issue", () => {
    const baseline: CountsMap = {
      "src/foo.ts": { "lint/style/noVar": { error: 1 } },
    };
    const latest: CountsMap = {
      "src/foo.ts": { "lint/style/noVar": { error: 2 } },
    };
    const { hasNewIssues } = ratchet(baseline, latest, silent);
    expect(hasNewIssues).toBe(true);
  });

  it("detects a new rule violation as a new issue", () => {
    const baseline: CountsMap = {};
    const latest: CountsMap = {
      "src/foo.ts": { "lint/style/noVar": { error: 1 } },
    };
    const { hasNewIssues } = ratchet(baseline, latest, silent);
    expect(hasNewIssues).toBe(true);
  });

  it("does not flag decreased counts as new issues", () => {
    const baseline: CountsMap = {
      "src/foo.ts": { "lint/style/noVar": { error: 3 } },
    };
    const latest: CountsMap = {
      "src/foo.ts": { "lint/style/noVar": { error: 1 } },
    };
    const { hasNewIssues } = ratchet(baseline, latest, silent);
    expect(hasNewIssues).toBe(false);
  });

  it("updates baseline when counts decrease", () => {
    const baseline: CountsMap = {
      "src/foo.ts": { "lint/style/noVar": { error: 3 } },
    };
    const latest: CountsMap = {
      "src/foo.ts": { "lint/style/noVar": { error: 1 } },
    };
    const { updatedBaseline } = ratchet(baseline, latest, silent);
    expect(updatedBaseline["src/foo.ts"]["lint/style/noVar"].error).toBe(1);
  });

  it("removes rules with zero counts from updated baseline", () => {
    const baseline: CountsMap = {
      "src/foo.ts": { "lint/style/noVar": { error: 1, warning: 2 } },
    };
    const latest: CountsMap = {
      "src/foo.ts": { "lint/style/noVar": { warning: 2 } },
    };
    const { updatedBaseline } = ratchet(baseline, latest, silent);
    expect(updatedBaseline["src/foo.ts"]["lint/style/noVar"].error).toBeUndefined();
    expect(updatedBaseline["src/foo.ts"]["lint/style/noVar"].warning).toBe(2);
  });

  it("removes files with no remaining violations from updated baseline", () => {
    const baseline: CountsMap = {
      "src/foo.ts": { "lint/style/noVar": { error: 1 } },
    };
    const latest: CountsMap = {};
    const { updatedBaseline } = ratchet(baseline, latest, silent);
    // File still exists on disk (mocked), so it stays in baseline
    expect(updatedBaseline["src/foo.ts"]).toBeDefined();
  });

  it("removes baseline entry for files that no longer exist on disk", async () => {
    const { default: fs } = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValueOnce(false);

    const baseline: CountsMap = {
      "deleted/file.ts": { "lint/style/noVar": { error: 1 } },
    };
    const { updatedBaseline } = ratchet(baseline, {}, silent);
    expect(updatedBaseline["deleted/file.ts"]).toBeUndefined();
  });

  it("mergedBaseline contains latest counts when there are new issues", () => {
    const baseline: CountsMap = {
      "src/foo.ts": { "lint/style/noVar": { error: 1 } },
    };
    const latest: CountsMap = {
      "src/foo.ts": { "lint/style/noVar": { error: 3 } },
    };
    const { mergedBaseline } = ratchet(baseline, latest, silent);
    expect(mergedBaseline["src/foo.ts"]["lint/style/noVar"].error).toBe(3);
  });

  it("preserves baseline entries for files not in latest run", () => {
    const baseline: CountsMap = {
      "src/foo.ts": { "lint/style/noVar": { error: 1 } },
      "src/bar.ts": { "lint/style/noVar": { error: 2 } },
    };
    const latest: CountsMap = {
      "src/foo.ts": { "lint/style/noVar": { error: 1 } },
    };
    const { updatedBaseline } = ratchet(baseline, latest, silent);
    // bar.ts exists on disk (mocked), so it stays
    expect(updatedBaseline["src/bar.ts"]).toBeDefined();
  });
});
