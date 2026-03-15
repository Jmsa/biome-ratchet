import fs from "fs";
import type { CountsMap } from "./parser";

const BASELINE_FILE = "./biome-ratchet.json";
const TEMP_FILE = "./biome-ratchet-temp.json";

export function loadBaseline(): CountsMap {
  if (!fs.existsSync(BASELINE_FILE)) return {};
  return JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8")) as CountsMap;
}

export function writeBaseline(data: CountsMap): void {
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(data, null, 2));
}

export function writeTempBaseline(data: CountsMap): void {
  fs.writeFileSync(TEMP_FILE, JSON.stringify(data, null, 2));
}

export function clearTempBaseline(): void {
  fs.writeFileSync(TEMP_FILE, JSON.stringify({}, null, 2));
}
