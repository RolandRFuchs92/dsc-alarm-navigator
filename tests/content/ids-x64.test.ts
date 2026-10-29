import { describe, expect, it } from "vitest";
import { findSection, getPanelModel, listPanelModels } from "@/lib/content/repo";
import { resolveRangeSection } from "@/lib/content/rules";

async function loadX64() {
  const model = await getPanelModel("x64");
  expect(model).not.toBeNull();
  const result = model!;
  return result;
}

describe("IDS X64 catalog", () => {
  it("has the model identity, defaults and the Classic LED keypad", async () => {
    const model = await loadX64();
    expect(model).toMatchObject({
      name: "X64",
      firmware: "2.8x",
      installerCodeDefault: "9999",
      masterCodeDefault: "1234",
      engineKey: "ids-xseries",
    });
    expect(model.keypads).toEqual([
      { slug: "classic-led", name: "Classic LED", componentKey: "ids-classic-led", displayType: "lights", lightCount: 16, isDefault: true },
    ]);
  });

  it("lists the manufacturer on the listPanelModels row, next to pc1864", async () => {
    const list = await listPanelModels();
    expect(list.map((m) => m.slug)).toEqual(expect.arrayContaining(["pc1864", "x64"]));
    expect(list.find((m) => m.slug === "x64")?.manufacturer).toBe("IDS");
  });

  it("finds sections inside the programmed ranges only", async () => {
    const model = await loadX64();
    for (const n of [1, 8, 23, 101, 164, 197, 201, 208]) expect(findSection(model, n)).not.toBeNull();
    for (const n of [9, 165, 209]) expect(findSection(model, n)).toBeNull();
  });

  it("resolves zone types for locations 1 and 2", async () => {
    const model = await loadX64();
    const section = findSection(model, 2)!;
    const loc2 = resolveRangeSection(section, 2);
    expect(loc2.entries).toHaveLength(8);
    expect(loc2.entries.map((e) => e.label)).toEqual(Array.from({ length: 8 }, (_, i) => `Zone ${i + 9} type`));
    expect(loc2.entries.every((e) => e.def === "00" && e.lookup === "zoneTypes")).toBe(true);
    const loc1 = resolveRangeSection(section, 1);
    expect(loc1.entries.map((e) => e.def)).toEqual(["01", "02", "04", "04", "04", "04", "04", "04"]);
  });

  it("resolves zone properties for location 109 (Table 23)", async () => {
    const model = await loadX64();
    const { options } = resolveRangeSection(findSection(model, 109)!, 109);
    expect(options).toHaveLength(16);
    expect(options.filter((o) => o.def).map((o) => o.n)).toEqual([6]);
    expect(options[5].on).toBe("Zone bypassing");
  });

  it("resolves partition zone allocation for location 201, unverified", async () => {
    const model = await loadX64();
    const section = findSection(model, 201)!;
    expect(section.verified).toBe(false);
    const { options } = resolveRangeSection(section, 201);
    expect(options).toHaveLength(64);
    expect(options.map((o) => o.on)).toEqual(Array.from({ length: 64 }, (_, i) => `Zone ${i + 1}`));
    expect(options.every((o) => o.def === false)).toBe(true);
  });

  it("has the zone type lookup, with 06 and 07 absent", async () => {
    const model = await loadX64();
    const values = (model.lookups.zoneTypes as { values: Record<string, string> }).values;
    expect(Object.keys(values).sort()).toEqual(
      ["00", "01", "02", "03", "04", "05", "08", "09", "10", "11", "12", "13", "14", "15"],
    );
  });

  it("has the user program commands u0 to u5", async () => {
    const model = await loadX64();
    expect(model.commands.map((c) => c.slug)).toEqual(["u0", "u1", "u2", "u3", "u4", "u5"]);
  });
});
