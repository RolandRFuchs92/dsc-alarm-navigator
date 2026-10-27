import { notFound } from "next/navigation";
import { MenuMap } from "@/components/map/MenuMap";
import type { MapStart } from "@/components/map/MenuMap";
import type { AppUser } from "@/lib/auth/guards";
import { findSection, getChosenKeypad, getPanelModel, listPanelModels } from "@/lib/content/repo";

// Where each model's data comes from, shown under every detail pane.
const SOURCE_TEXTS: Record<string, string> = {
  pc1864: "From the DSC PC1616/PC1832/PC1864 v4.2 installation guide. Check your version with [900]. The simulator never touches a real panel.",
};

type Request = { user: AppUser; modelSlug: string; section: string | null; sub: string | null; cmd: string | null };

// Shared by /map and /map/[section]: validate the deep link, pick the keypad, render the map.
export async function renderMap({ user, modelSlug, section, sub, cmd }: Request) {
  const model = await getPanelModel(modelSlug);
  if (!model) notFound();
  let num: number | null = null;
  if (section !== null) {
    num = /^\d{1,3}$/.test(section) ? Number(section) : NaN;
    if (Number.isNaN(num) || !findSection(model, num)) notFound();
  }
  const start: MapStart = {
    section: num,
    sub: sub && /^\d{1,2}$/.test(sub) ? sub : null,
    command: num === null && cmd && model.commands.some((c) => c.slug === cmd) ? cmd : null,
  };
  const [keypad, models] = await Promise.all([getChosenKeypad(user.id, model), listPanelModels()]);
  const maker = models.find((m) => m.slug === model.slug)?.manufacturer ?? "";
  const sourceText = SOURCE_TEXTS[model.slug] ?? `From the ${maker} ${model.name} installation guide. The simulator never touches a real panel.`;
  return (
    <MenuMap
      model={model}
      keypad={keypad}
      start={start}
      basePath={`/devices/${model.slug}/map`}
      subtitle={`${maker} firmware v${model.firmware}`.trim()}
      sourceText={sourceText}
    />
  );
}
