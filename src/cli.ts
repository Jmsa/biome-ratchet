#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import chalk from "chalk";
import { parseBiomeOutput } from "./parser";
import { loadBaseline, writeBaseline, writeTempBaseline, clearTempBaseline } from "./baseline";
import { ratchet } from "./ratchet";

const [command, ...rest] = process.argv.slice(2);

if (command !== "lint") {
  if (!command) {
    console.error("Usage: biome-ratchet lint [biome lint args]");
  } else {
    console.error(`Unknown command: ${command}. Only 'lint' is supported.`);
  }
  process.exit(1);
}

// Always use json reporter; strip any --reporter flag the user passed
const biomeArgs = [
  "lint",
  "--reporter=json",
  ...rest.filter((a) => !a.startsWith("--reporter")),
];

const result = spawnSync("biome", biomeArgs, {
  encoding: "utf8",
  stdio: ["inherit", "pipe", "inherit"],
});

if (result.error) {
  console.error("Failed to run biome:", result.error.message);
  process.exit(1);
}

const stdout = result.stdout ?? "";
if (!stdout.trim()) {
  console.error("biome produced no JSON output");
  process.exit(1);
}

const latest = parseBiomeOutput(stdout);
const baseline = loadBaseline();
const { hasNewIssues, updatedBaseline, mergedBaseline } = ratchet(baseline, latest);

if (hasNewIssues) {
  writeTempBaseline(mergedBaseline);
  console.log(
    `${chalk.red("\nNew biome-ratchet issues detected!")}\nLatest results saved to ${chalk.yellow("biome-ratchet-temp.json")}.\nIf intentional, replace ${chalk.white("biome-ratchet.json")} with it and commit.`
  );
  process.exit(1);
} else {
  writeBaseline(updatedBaseline);
  clearTempBaseline();

  const hasImprovements =
    JSON.stringify(updatedBaseline) !== JSON.stringify(baseline);
  if (hasImprovements) {
    console.log(chalk.green("Improvements detected — baseline updated."));
  }

  if (process.env.RATCHET_DEFAULT_EXIT_ZERO === "true") {
    process.exit(0);
  }
}
