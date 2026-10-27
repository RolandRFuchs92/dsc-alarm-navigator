import { describe, expect, it } from "vitest";
import { convertLegacy, loadLegacyData } from "@/scripts/convert-legacy";
import { searchSections } from "@/lib/content/search";

const model = convertLegacy(loadLegacyData());

describe("searchSections", () => {
  it("searchSections 'entry delay' ranks s005 above the [*][9] command", () => {
    const ids = searchSections(model, "entry delay").map((h) => h.id);
    expect(ids).toContain("s005");
    expect(ids).toContain("k9");
    expect(ids.indexOf("s005")).toBeLessThan(ids.indexOf("k9"));
  });

  it("searchSections '201' returns s201 first", () => {
    const hits = searchSections(model, "201");
    expect(hits[0]).toMatchObject({ id: "s201", num: 201, code: "[201]" });
  });

  it("finds a range instance by number with its own label", () => {
    const hits = searchSections(model, "211");
    expect(hits[0]).toMatchObject({ id: "s202", num: 211, code: "[211]" });
    expect(hits[0].label).toMatch(/: /);
  });

  it("strips brackets and caps the list at 14", () => {
    expect(searchSections(model, "[005]")[0]).toMatchObject({ id: "s005", num: 5 });
    expect(searchSections(model, "zone").length).toBeLessThanOrEqual(14);
    expect(searchSections(model, "   ")).toEqual([]);
  });

  // Same as the legacy app: range sections are indexed by label only, so only [*][4] matches.
  it("finds chime as the [*][4] command", () => {
    expect(searchSections(model, "chime")).toEqual([{ id: "k4", num: null, code: "[*][4]", label: "Door chime on/off" }]);
  });
});
