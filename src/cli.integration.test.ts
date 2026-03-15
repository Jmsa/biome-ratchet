import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const CLI = path.resolve(__dirname, "../dist/cli.js");
const EXAMPLE_DIR = path.resolve(__dirname, "../example");
const NODE_MODULES_BIN = path.resolve(__dirname, "../node_modules/.bin");

function runRatchet(cwd: string, args: string[] = ["src"]) {
  return spawnSync("node", [CLI, "lint", ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${NODE_MODULES_BIN}:${process.env.PATH ?? ""}`,
      FORCE_COLOR: "0",
    },
  });
}

function setupTempDir(): string {
  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "biome-ratchet-test-")
  );
  fs.cpSync(EXAMPLE_DIR, tmpDir, { recursive: true });
  return tmpDir;
}

function readJson(filepath: string): unknown {
  return JSON.parse(fs.readFileSync(filepath, "utf8"));
}

describe("biome-ratchet CLI (integration)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = setupTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("fails on first run when no baseline exists", () => {
    const result = runRatchet(tmpDir);
    expect(result.status).toBe(1);
    expect(fs.existsSync(path.join(tmpDir, "biome-ratchet.json"))).toBe(false);
  });

  it("writes biome-ratchet-temp.json on first run with current violations", () => {
    runRatchet(tmpDir);
    const tempPath = path.join(tmpDir, "biome-ratchet-temp.json");
    expect(fs.existsSync(tempPath)).toBe(true);
    const temp = readJson(tempPath) as Record<string, unknown>;
    // Should contain exactly one file with noDoubleEquals errors
    const files = Object.keys(temp);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/index\.ts$/);
    const fileEntry = temp[files[0]] as Record<string, { error?: number }>;
    expect(fileEntry["lint/suspicious/noDoubleEquals"].error).toBe(2);
  });

  it("passes when violations match the committed baseline", () => {
    // Initialize baseline from temp file
    runRatchet(tmpDir);
    fs.copyFileSync(
      path.join(tmpDir, "biome-ratchet-temp.json"),
      path.join(tmpDir, "biome-ratchet.json")
    );

    const result = runRatchet(tmpDir);
    expect(result.status).toBe(0);
  });

  it("fails when new violations are introduced beyond baseline", () => {
    // Initialize baseline
    runRatchet(tmpDir);
    fs.copyFileSync(
      path.join(tmpDir, "biome-ratchet-temp.json"),
      path.join(tmpDir, "biome-ratchet.json")
    );

    // Add another == violation
    fs.appendFileSync(
      path.join(tmpDir, "src/index.ts"),
      "\nif (x == 3) console.log('extra');\n"
    );

    const result = runRatchet(tmpDir);
    expect(result.status).toBe(1);
  });

  it("passes and updates baseline when violations are reduced", () => {
    // Start with a baseline that has 2 errors, then fix one
    runRatchet(tmpDir);
    fs.copyFileSync(
      path.join(tmpDir, "biome-ratchet-temp.json"),
      path.join(tmpDir, "biome-ratchet.json")
    );

    // Overwrite with a file that only has 1 == violation
    fs.writeFileSync(
      path.join(tmpDir, "src/index.ts"),
      [
        "// intentional lint violations for biome-ratchet integration tests",
        "const x = 1;",
        "const y = 2;",
        "",
        "if (x == y) {",
        '  console.log("equal");',
        "}",
        "",
        "// second == removed — improvement",
        "if (x === 0) {",
        '  console.log("zero");',
        "}",
      ].join("\n")
    );

    const result = runRatchet(tmpDir);
    expect(result.status).toBe(0);

    // Baseline should now reflect the reduced count
    const baseline = readJson(
      path.join(tmpDir, "biome-ratchet.json")
    ) as Record<string, Record<string, { error?: number }>>;
    const fileKey = Object.keys(baseline)[0];
    expect(baseline[fileKey]["lint/suspicious/noDoubleEquals"].error).toBe(1);
  });
});
