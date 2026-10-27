import { describe, expect, it } from "vitest";
import { engine, model } from "./helpers";
import type { DscState } from "@/lib/engines/dsc-powerseries/state";
import type { PanelModelData, SectionDef } from "@/lib/content/types";

// A data section whose entry list is empty must not crash the reducer.
describe("dsc-powerseries data mode with no entries", () => {
  it("beeps an error instead of throwing", () => {
    const template = model.groups[0].sections[0];
    const section: SectionDef = { ...template, slug: "sEmpty", num: 999, range: null, rule: null, entries: [], subs: null, options: null };
    const synthetic: PanelModelData = { ...model, groups: [{ slug: "g", label: "G", sections: [section] }] };
    const state: DscState = { ...engine.createInitialState(synthetic), mode: "data", nodeId: "sEmpty", section: 999 };
    for (const key of ["1", ">", "<", "*"] as const) {
      const next = engine.pressKey(state, key, synthetic);
      expect(next.beep).toBe("error");
    }
  });
});
