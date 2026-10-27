"use client";

import { useMemo, useRef } from "react";
import { KeypadHost } from "@/components/keypads/KeypadHost";
import type { KeypadHandle } from "@/components/keypads/KeypadHost";
import type { GuideStep } from "@/lib/content/repo";
import type { KeypadModelDef, PanelModelData } from "@/lib/content/types";
import { getEngine } from "@/lib/engines";
import { buildStepState } from "@/lib/guides/replay";
import styles from "./guide.module.css";

type Props = { model: PanelModelData; keypad: KeypadModelDef; steps: GuideStep[]; stepIndex: number };

// The keypad as it should look before this step. Presses here are scratch; "Back to step" undoes them.
export function GuideRunner({ model, keypad, steps, stepIndex }: Props) {
  const engine = getEngine(model.engineKey);
  const stepState = useMemo(() => buildStepState(engine, model, steps, stepIndex), [engine, model, steps, stepIndex]);
  const hostRef = useRef<KeypadHandle>(null);
  return (
    <div className={styles.keypadCol}>
      {/* key: a new step remounts the host so it starts from that step's state */}
      <KeypadHost key={stepIndex} ref={hostRef} model={model} engineKey={model.engineKey} keypad={keypad} initialState={stepState}>
        <button type="button" onClick={() => hostRef.current?.applyState(() => stepState)}>{`Back to step ${stepIndex + 1}`}</button>
      </KeypadHost>
      <p className="keypad-note">Your real keypad should look like this before you press this step's keys. Presses here are practice only.</p>
    </div>
  );
}
