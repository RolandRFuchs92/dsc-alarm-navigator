"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeypadHost } from "@/components/keypads/KeypadHost";
import type { KeypadHandle } from "@/components/keypads/KeypadHost";
import type { SearchHit } from "@/lib/content/search";
import type { KeypadModelDef, PanelModelData } from "@/lib/content/types";
import { getEngine } from "@/lib/engines";
import type { Focus, Worksheet } from "@/lib/engines/types";
import { copyWorksheet, loadWorksheet, saveWorksheet } from "@/lib/worksheet";
import { DetailPanel } from "./DetailPanel";
import type { DetailActions } from "./SectionBodies";
import { Search } from "./Search";
import { Tree } from "./Tree";
import { WherePanel } from "./WherePanel";

export type MapStart = { section: number | null; sub: string | null; command: string | null };

type Props = {
  model: PanelModelData;
  keypad: KeypadModelDef;
  start: MapStart;
  basePath: string; // e.g. /devices/pc1864/map
  subtitle: string;
  sourceText: string;
};

// The legacy DSC opening, inside [001] about to program zone 1. Other panels open idle: the IDS keypad has to be idle
// for hold [*] (user manual §9) and hold [9] (§5).
const DEFAULT_SECTION: Record<string, number> = { "dsc-powerseries": 1 };

const EMPTY_FOCUS: Focus = { nodeId: null, mode: "", entryIndex: null, buffer: "", trail: [], isInstallerTop: false, beep: null };

// The URL that reopens this state: /map/005?sub=02 for sections, /map?cmd=k5 for [*] commands.
function buildMapUrl(basePath: string, sectionNum: number | null, subCode: string | null, nodeId: string | null): string {
  if (sectionNum !== null) {
    const result = `${basePath}/${String(sectionNum).padStart(3, "0")}${subCode ? `?sub=${subCode}` : ""}`;
    return result;
  }
  const result = nodeId ? `${basePath}?cmd=${nodeId}` : basePath;
  return result;
}

// The menu map: search, section tree, "you are here", keypad and detail, all driven by one engine state.
export function MenuMap({ model, keypad, start, basePath, subtitle, sourceText }: Props) {
  const engine = getEngine(model.engineKey);
  const hostRef = useRef<KeypadHandle>(null);
  const isLoaded = useRef(false);

  // Deep link, else the engine's default opening (DEFAULT_SECTION), else idle.
  const buildStart = useCallback((worksheet?: Worksheet): unknown => {
    const fresh = engine.createInitialState(model, worksheet);
    if (start.section !== null && engine.navigateToSection) return engine.navigateToSection(fresh, model, start.section, start.sub);
    if (start.command && engine.navigateToNode) return engine.navigateToNode(fresh, model, start.command);
    const opening = DEFAULT_SECTION[model.engineKey];
    const result = opening !== undefined && engine.navigateToSection ? engine.navigateToSection(fresh, model, opening) : fresh;
    return result;
  }, [engine, model, start]);

  // Server render uses factory defaults; the saved worksheet is only readable in the browser.
  const initialState = useMemo(() => buildStart(), [buildStart]);
  const [state, setState] = useState<unknown>(initialState);

  useEffect(() => {
    const saved = loadWorksheet(model.slug);
    isLoaded.current = true;
    hostRef.current?.applyState(() => buildStart(saved));
  }, [model.slug, buildStart]);

  const handleStateChange = useCallback((next: unknown) => {
    setState(next);
    // Never save before the stored worksheet is loaded, or the first render would wipe it.
    if (isLoaded.current) saveWorksheet(model.slug, copyWorksheet(engine.selectWorksheet(next)));
  }, [engine, model.slug]);

  const location = engine.selectLocation(state, model);
  const focus = engine.selectFocus ? engine.selectFocus(state, model) : EMPTY_FOCUS;
  const worksheet = engine.selectWorksheet(state);

  useEffect(() => {
    const url = buildMapUrl(basePath, location.sectionNum, location.subCode, focus.nodeId);
    try {
      if (`${window.location.pathname}${window.location.search}` !== url) window.history.replaceState(null, "", url);
    } catch { /* history blocked in some frames */ }
  }, [basePath, location.sectionNum, location.subCode, focus.nodeId]);

  const apply = (update: (s: unknown) => unknown) => hostRef.current?.applyState(update);
  const pickNode = (id: string, num?: number) => apply((s) => engine.navigateToNode?.(s, model, id, num) ?? s);
  // Row clicks the engine can't do are left out, so those rows aren't clickable and their hints are hidden.
  const { navigateToSub, navigateToEntry, applyLookupValue, flipOption } = engine;
  const actions: DetailActions = {
    pickNode,
    pickSub: navigateToSub ? (code) => apply((s) => navigateToSub(s, model, code)) : undefined,
    pickEntry: navigateToEntry ? (index) => apply((s) => navigateToEntry(s, index)) : undefined,
    pickValue: applyLookupValue ? (code) => apply((s) => applyLookupValue(s, model, code)) : undefined,
    pickOption: flipOption ? (n) => apply((s) => flipOption(s, model, n)) : undefined,
  };

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <h1>{model.name} Menu Map</h1>
          <span className="model">{subtitle}</span>
        </div>
        <Search model={model} onPick={(hit: SearchHit) => pickNode(hit.id, hit.num ?? undefined)} />
      </header>
      <div className="layout">
        <Tree model={model} currentId={focus.nodeId} onPick={(id) => pickNode(id)} />
        <main className="main">
          <WherePanel location={location} trail={focus.trail} onCrumb={(target) => apply((s) => engine.followCrumb?.(s, model, target) ?? s)} />
          <div className="keypad-wrap">
            <KeypadHost ref={hostRef} model={model} engineKey={model.engineKey} keypad={keypad} initialState={initialState} onStateChange={handleStateChange}>
              <button type="button" onClick={() => apply((s) => engine.resetKeypad?.(s) ?? s)}>Reset keypad</button>
              <button type="button" onClick={() => apply((s) => engine.clearWorksheet?.(s) ?? s)}>Clear my entries</button>
            </KeypadHost>
            <p className="keypad-note">Press the keys the same way as on your real keypad, or use your keyboard: digits, * and #. Esc works as #.</p>
          </div>
          <DetailPanel model={model} focus={focus} location={location} worksheet={worksheet} sourceText={sourceText} on={actions} />
        </main>
      </div>
    </>
  );
}
