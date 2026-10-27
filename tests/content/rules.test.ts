import { describe, expect, it } from "vitest";
import { resolveRangeSection } from "@/lib/content/rules";
import type { SectionDef } from "@/lib/content/types";

function makeSection(range: [number, number], rule: SectionDef["rule"]): SectionDef {
  const result: SectionDef = {
    slug: "s", num: null, range, label: "L", kind: "data", description: "", subDigits: null,
    rule, entries: null, options: null, subs: null, tips: [], related: [], pages: 1,
    confirm: false, danger: false, verified: true,
  };
  return result;
}

describe("resolveRangeSection", () => {
  it("offset: describe uses n - start + base", () => {
    const s = makeSection([181, 188], { kind: "offset", start: 181, base: 1, describe: "Partition {i}" });
    expect(resolveRangeSection(s, 181).describe).toBe("Partition 1");
    expect(resolveRangeSection(s, 188).describe).toBe("Partition 8");
  });

  it("block: base 0 and base 32 with max", () => {
    const a = makeSection([320, 323], {
      kind: "block", start: 320, size: 16, base: 0, describe: "Zones {first}-{last}",
      entries: { label: "Zone {item}", digits: 2 },
    });
    const r = resolveRangeSection(a, 321);
    expect(r.describe).toBe("Zones 17-32");
    expect(r.entries).toHaveLength(16);
    expect(r.entries[0]).toMatchObject({ label: "Zone 17", digits: 2 });
    const b = makeSection([601, 604], {
      kind: "block", start: 601, size: 16, base: 32, max: 95, describe: "Users {first}-{last}",
      entries: { label: "Code {item}", digits: 2 },
    });
    const r2 = resolveRangeSection(b, 604);
    expect(r2.describe).toBe("Users 81-95");
    expect(r2.entries).toHaveLength(15);
    expect(r2.entries[14].label).toBe("Code 95");
  });

  it("grid: partition, zone span and options", () => {
    const s = makeSection([202, 265], {
      kind: "grid", start: 202, perGroup: 8, size: 8,
      describe: "Partition {group}, zones {first}-{last}",
      options: { count: 8, on: "Zone {item} on this partition", off: "Not on this partition", def: true },
      defaultWhen: { n: 202 },
    });
    const r = resolveRangeSection(s, 211);
    expect(r.describe).toBe("Partition 2, zones 9-16");
    expect(r.options[0]).toEqual({ n: 1, on: "Zone 9 on this partition", off: "Not on this partition", def: false });
    expect(r.options[7].n).toBe(8);
    expect(resolveRangeSection(s, 202).options.every((o) => o.def)).toBe(true);
    expect(resolveRangeSection(s, 210).options.every((o) => !o.def)).toBe(true);
  });

  it("labels are indexed by n - start", () => {
    const s = makeSection([301, 303], {
      kind: "offset", start: 301, base: 1, labels: ["1st number", "2nd number", "3rd number (backup for 1st)"],
    });
    expect(resolveRangeSection(s, 303).describe).toBe("3rd number (backup for 1st)");
  });

  it("entry labels list and defByItem", () => {
    const s = makeSection([1, 4], {
      kind: "block", start: 1, size: 16, base: 0, describe: "Zones {first}-{last}",
      entries: { label: "Zone {item}", digits: 2, def: "00", defByItem: { "1": "01" }, lookup: "zoneTypes" },
    });
    const r = resolveRangeSection(s, 1);
    expect(r.entries[0]).toEqual({ label: "Zone 1", digits: 2, def: "01", lookup: "zoneTypes" });
    expect(r.entries[1].def).toBe("00");
    const d = makeSection([181, 188], {
      kind: "offset", start: 181, base: 1, entries: { labels: ["Sunday", "Monday"], digits: 4, def: "9999" },
    });
    expect(resolveRangeSection(d, 181).entries.map((e) => e.label)).toEqual(["Sunday", "Monday"]);
  });

  it("throws RangeError outside the range", () => {
    const s = makeSection([181, 188], { kind: "offset", start: 181, base: 1, describe: "P {i}" });
    expect(() => resolveRangeSection(s, 180)).toThrow(RangeError);
    expect(() => resolveRangeSection(s, 189)).toThrow(RangeError);
  });

  it("describe-only rule returns static options and entries verbatim", () => {
    const s = makeSection([351, 358], { kind: "offset", start: 351, base: 1, describe: "Partition {i}" });
    s.options = [
      { n: 1, on: "Number 1", off: "", def: true },
      { n: 6, on: "For future use", off: "", def: false, future: true },
    ];
    s.entries = [{ label: "Account", digits: 4 }];
    for (let n = 351; n <= 358; n += 1) {
      const r = resolveRangeSection(s, n);
      expect(r.options).toEqual(s.options);
      expect(r.entries).toEqual(s.entries);
    }
    const bare = makeSection([351, 358], { kind: "offset", start: 351, base: 1, describe: "P {i}" });
    expect(resolveRangeSection(bare, 351)).toMatchObject({ entries: [], options: [] });
  });

  it("copies variable onto built entries and omits it otherwise", () => {
    const s = makeSection([301, 303], {
      kind: "offset", start: 301, base: 1, entries: { label: "Phone number", digits: 32, variable: true },
    });
    expect(resolveRangeSection(s, 301).entries).toEqual([{ label: "Phone number", digits: 32, variable: true }]);
    const t = makeSection([301, 303], { kind: "offset", start: 301, base: 1, entries: { label: "X", digits: 2 } });
    expect("variable" in resolveRangeSection(t, 301).entries[0]).toBe(false);
  });
});
