export type SeverityKey = "error" | "warning";
export type RuleCounts = Record<string, Partial<Record<SeverityKey, number>>>;
export type CountsMap = Record<string, RuleCounts>;

interface BiomeDiagnostic {
  severity: string;
  category?: string;
  location?: { path?: { file?: string } | null };
}

interface BiomeJsonOutput {
  diagnostics: BiomeDiagnostic[];
}

export function parseBiomeOutput(json: string): CountsMap {
  const output = JSON.parse(json) as BiomeJsonOutput;
  const counts: CountsMap = {};

  for (const diag of output.diagnostics) {
    if (!diag.category?.startsWith("lint/")) continue;
    const file = diag.location?.path?.file;
    if (!file) continue;
    const rule = diag.category;
    const severity: SeverityKey =
      diag.severity === "error" || diag.severity === "fatal"
        ? "error"
        : "warning";

    counts[file] ??= {};
    counts[file][rule] ??= {};
    counts[file][rule][severity] = (counts[file][rule][severity] ?? 0) + 1;
  }

  return counts;
}
