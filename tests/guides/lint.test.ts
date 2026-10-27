import { describe, expect, it } from "vitest";
import { findSection, getGuide, getPanelModel, listGuides, listPanelModels } from "@/lib/content/repo";
import { getEngine } from "@/lib/engines";
import { parseKeys } from "@/lib/guides/keys";

// Content lint: every guide stored in dsc_test must replay through its engine with no parse
// error and no error state after any step, and every section_ref must name a real section.
describe("guide lint", () => {
  it("every stored guide replays cleanly", async () => {
    const problems: string[] = [];
    let checked = 0;
    for (const m of await listPanelModels()) {
      const model = (await getPanelModel(m.slug))!;
      const engine = getEngine(model.engineKey);
      for (const summary of await listGuides(m.slug)) {
        const guide = (await getGuide(m.slug, summary.slug))!;
        let state = engine.createInitialState(model);
        for (const step of guide.steps) {
          const where = `guide ${guide.slug}, step ${step.position}, keys "${step.keys}"`;
          checked += 1;
          try {
            parseKeys(step.keys, model).forEach((key) => {
              state = engine.pressKey(state, key, model);
            });
          } catch (err) {
            problems.push(`${where}: ${(err as Error).message}`);
            break;
          }
          if (engine.selectLocation(state, model).isError) problems.push(`${where}: keypad is in an error state`);
          if (step.sectionRef !== null && !findSection(model, step.sectionRef)) problems.push(`${where}: no section ${step.sectionRef}`);
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
    expect(problems).toEqual([]);
  });
});
