import { describe, expect, it } from "vitest";
import { findSection, getPanelModel, listPanelModels, saveKeypadChoice } from "@/lib/content/repo";

describe("content repository", () => {
  it("getPanelModel('pc1864') has 109 sections and 3 keypads", async () => {
    const model = await getPanelModel("pc1864");
    expect(model).not.toBeNull();
    expect(model!.groups.flatMap((g) => g.sections)).toHaveLength(109);
    expect(model!.keypads).toHaveLength(3);
  });

  it("getPanelModel('nope') returns null", async () => {
    expect(await getPanelModel("nope")).toBeNull();
  });

  it("lists the pc1864 model", async () => {
    const list = await listPanelModels();
    expect(list.map((m) => m.slug)).toContain("pc1864");
  });

  it("findSection(model, 211) returns the s202 range section", async () => {
    const model = (await getPanelModel("pc1864"))!;
    expect(findSection(model, 211)?.slug).toBe("s202");
  });

  it("findSection(model, 998) returns null", async () => {
    const model = (await getPanelModel("pc1864"))!;
    expect(findSection(model, 998)).toBeNull();
  });

  it("saveKeypadChoice rejects a keypad not offered for the model", async () => {
    await expect(saveKeypadChoice("nobody", "pc1864", "pk9999")).rejects.toMatchObject({ name: "KeypadNotOfferedError" });
    await expect(saveKeypadChoice("nobody", "nope", "pk5500")).rejects.toMatchObject({ name: "UnknownModelError" });
  });
});
