import { describe, expect, it } from "vitest";
import { normalizeNoEntryArmed, parseKeys, runEngineFlagged, runLegacy } from "./helpers";
import type { Key } from "@/lib/engines/types";

// Differential test: src/app.js (run headless) is the oracle. Every key press must give the same
// LCD lines, LEDs, crumbs, waiting text and error state.
const SCRIPTS = [
  "* 8 5 5 5 5 0 0 1 0 3 0 4 < > 1 # #",
  "* 8 5 5 5 5 0 0 5 0 2 > 0 3 0 # 0 9 # 9 9 #",
  "* 8 5 5 5 5 2 0 1 2 3 # 2 1 1 1 2 # 1 2 3 9 1 9 # #",
  "* 8 5 5 5 5 3 0 1 5 5 5 * 4 * 1 # 3 0 2 #",
  "* 8 5 5 5 5 9 9 9 5 5 5 5 9 9 9 9 9 9 5 5 5 5 9 9 8",
  "* 8 5 5 5 5 9 8 9 9 0 0 0 0 # # #",
  "* 8 5 5 5 5 4 0 2 1 2 3 4 5 6 #",
  "* 8 5 5 5 5 9 0 1 7 # 8 0 4 #",
  "* 8 5 5 5 5 0 0 1 * 1 2 * 9 # 7 0 1 5 # # * 8 1 2 3 4 5 6",
  "* 1 0 5 0 5 9 9 0 0 7 7 #",
  "* 2 1 8 #",
  "* 3 # * 4 # * 0 # * 9 1 2 3 4 #",
  "* 5 1 2 3 4 0 5 1 1 1 1 4 0 * 9 6 9 8 0 3 2 # 9 9 0 7 3 # #",
  "* 6 1 2 3 4 1 5 #",
  "* 7 5 3 #",
  "1 * 8 # 8 5 5 5 5 #",
];

const KEYS: Key[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "#", "<", ">"];

// Small deterministic PRNG (mulberry32) so fuzz runs are reproducible.
function createRandom(seed: number): () => number {
  let a = seed;
  const result = (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return result;
}

// Random walks that start inside installer programming or the [*] menu, weighted toward digits.
function buildFuzzKeys(seed: number): Key[] {
  const random = createRandom(seed);
  const prefixes = ["* 8 5 5 5 5", "* 5 1 2 3 4", "*", ""];
  const keys = parseKeys(prefixes[seed % prefixes.length]);
  for (let i = 0; i < 60; i += 1) {
    const r = random();
    const key = r < 0.75 ? KEYS[Math.floor(random() * 10)] : KEYS[10 + Math.floor(random() * 4)];
    keys.push(key);
  }
  const result = keys;
  return result;
}

describe("dsc-powerseries engine matches src/app.js", () => {
  it.each(SCRIPTS)("script: %s", (script) => {
    const keys = parseKeys(script);
    const legacy = runLegacy(keys);
    const { snaps, flags } = runEngineFlagged(keys);
    expect(normalizeNoEntryArmed(snaps, legacy, flags)).toEqual(legacy);
  });

  it("fuzz: 400 seeded random key walks", () => {
    for (let seed = 1; seed <= 400; seed += 1) {
      const keys = buildFuzzKeys(seed);
      const legacy = runLegacy(keys);
      const { snaps, flags } = runEngineFlagged(keys);
      const ours = normalizeNoEntryArmed(snaps, legacy, flags);
      ours.forEach((snap, i) => {
        expect(snap, `seed ${seed}, after ${keys.slice(0, i).join(" ")}`).toEqual(legacy[i]);
      });
    }
  });
});
