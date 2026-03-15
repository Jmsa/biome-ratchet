import fs from "fs";
import chalk from "chalk";
import type { CountsMap, SeverityKey } from "./parser";

export interface RatchetResult {
  hasNewIssues: boolean;
  updatedBaseline: CountsMap;
  mergedBaseline: CountsMap;
}

interface Logger {
  log: (...args: unknown[]) => void;
}

const SEVERITIES: SeverityKey[] = ["error", "warning"];

function cleanCounts(map: CountsMap): CountsMap {
  const result = structuredClone(map);
  for (const file of Object.keys(result)) {
    for (const rule of Object.keys(result[file])) {
      for (const sev of SEVERITIES) {
        if ((result[file][rule][sev] ?? 0) === 0) {
          delete result[file][rule][sev];
        }
      }
      if (Object.keys(result[file][rule]).length === 0) {
        delete result[file][rule];
      }
    }
    if (Object.keys(result[file]).length === 0) {
      delete result[file];
    }
  }
  return result;
}

export function ratchet(
  baseline: CountsMap,
  latest: CountsMap,
  logger: Logger = console
): RatchetResult {
  let hasNewIssues = false;
  const updatedBaseline = structuredClone(baseline);

  // Compare latest violations against baseline
  for (const [file, rules] of Object.entries(latest)) {
    const baselineFile = baseline[file] ?? {};
    let fileHeaderPrinted = false;

    const printFileHeader = () => {
      if (!fileHeaderPrinted) {
        logger.log(chalk.underline(file));
        fileHeaderPrinted = true;
      }
    };

    for (const [rule, counts] of Object.entries(rules)) {
      const baselineRule = baselineFile[rule] ?? {};

      for (const severity of SEVERITIES) {
        const current = counts[severity] ?? 0;
        const previous = baselineRule[severity] ?? 0;
        if (current === previous) continue;

        printFileHeader();
        logger.log(`  ${rule}`);

        if (current > previous) {
          hasNewIssues = true;
          logger.log(
            `    ${severity}: ${chalk.red(current)} (was ${chalk.yellow(previous)})`
          );
        } else {
          logger.log(
            `    ${severity}: ${chalk.green(current)} (was ${chalk.yellow(previous)})`
          );
        }
      }
    }

    updatedBaseline[file] = structuredClone(rules);
  }

  // Remove baseline entries for files that no longer exist on disk
  for (const file of Object.keys(baseline)) {
    if (!(file in latest) && !fs.existsSync(file)) {
      delete updatedBaseline[file];
    }
  }

  // Build merged baseline: baseline + latest (for temp file)
  const mergedBaseline: CountsMap = { ...structuredClone(baseline), ...structuredClone(latest) };
  for (const file of Object.keys(baseline)) {
    if (!(file in latest) && !fs.existsSync(file)) {
      delete mergedBaseline[file];
    }
  }

  return {
    hasNewIssues,
    updatedBaseline: cleanCounts(updatedBaseline),
    mergedBaseline: cleanCounts(mergedBaseline),
  };
}
