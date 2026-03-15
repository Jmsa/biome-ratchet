import { describe, it, expect } from "vitest";
import { parseBiomeOutput } from "./parser";

const makeDiagnostic = (
  category: string | undefined,
  severity: string,
  path: string | undefined
) => ({
  severity,
  category,
  location: path ? { path: { file: path } } : undefined,
});

const wrapDiagnostics = (diagnostics: object[]) =>
  JSON.stringify({ diagnostics, summary: {}, command: "lint" });

describe("parseBiomeOutput", () => {
  it("returns empty map for no diagnostics", () => {
    const result = parseBiomeOutput(wrapDiagnostics([]));
    expect(result).toEqual({});
  });

  it("counts a single error", () => {
    const result = parseBiomeOutput(
      wrapDiagnostics([
        makeDiagnostic(
          "lint/suspicious/noDoubleEquals",
          "error",
          "src/foo.ts"
        ),
      ])
    );
    expect(result).toEqual({
      "src/foo.ts": {
        "lint/suspicious/noDoubleEquals": { error: 1 },
      },
    });
  });

  it("counts a warning", () => {
    const result = parseBiomeOutput(
      wrapDiagnostics([
        makeDiagnostic("lint/style/noVar", "warning", "src/bar.ts"),
      ])
    );
    expect(result).toEqual({
      "src/bar.ts": { "lint/style/noVar": { warning: 1 } },
    });
  });

  it("maps fatal severity to error", () => {
    const result = parseBiomeOutput(
      wrapDiagnostics([
        makeDiagnostic("lint/suspicious/noDebugger", "fatal", "src/x.ts"),
      ])
    );
    expect(result["src/x.ts"]["lint/suspicious/noDebugger"].error).toBe(1);
  });

  it("accumulates multiple violations of the same rule in the same file", () => {
    const result = parseBiomeOutput(
      wrapDiagnostics([
        makeDiagnostic(
          "lint/suspicious/noDoubleEquals",
          "error",
          "src/foo.ts"
        ),
        makeDiagnostic(
          "lint/suspicious/noDoubleEquals",
          "error",
          "src/foo.ts"
        ),
        makeDiagnostic("lint/suspicious/noDoubleEquals", "warning", "src/foo.ts"),
      ])
    );
    expect(result["src/foo.ts"]["lint/suspicious/noDoubleEquals"]).toEqual({
      error: 2,
      warning: 1,
    });
  });

  it("groups violations by file and rule", () => {
    const result = parseBiomeOutput(
      wrapDiagnostics([
        makeDiagnostic("lint/style/noVar", "error", "src/a.ts"),
        makeDiagnostic("lint/style/noVar", "error", "src/b.ts"),
        makeDiagnostic("lint/correctness/noUnusedImports", "warning", "src/a.ts"),
      ])
    );
    expect(result).toEqual({
      "src/a.ts": {
        "lint/style/noVar": { error: 1 },
        "lint/correctness/noUnusedImports": { warning: 1 },
      },
      "src/b.ts": {
        "lint/style/noVar": { error: 1 },
      },
    });
  });

  it("ignores diagnostics without a lint category", () => {
    const result = parseBiomeOutput(
      wrapDiagnostics([
        makeDiagnostic(undefined, "error", "src/foo.ts"),
        makeDiagnostic("format", "error", "src/foo.ts"),
        makeDiagnostic("parse", "error", "src/foo.ts"),
      ])
    );
    expect(result).toEqual({});
  });

  it("ignores diagnostics without a file path", () => {
    const result = parseBiomeOutput(
      wrapDiagnostics([
        makeDiagnostic("lint/style/noVar", "error", undefined),
      ])
    );
    expect(result).toEqual({});
  });
});
