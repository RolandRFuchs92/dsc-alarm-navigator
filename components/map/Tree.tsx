"use client";

import { useEffect, useState } from "react";
import { formatNodeCode } from "@/lib/content/format";
import type { KeypadCommandDef, PanelModelData, SectionDef } from "@/lib/content/types";

type Props = { model: PanelModelData; currentId: string | null; onPick: (id: string) => void };

const KEYPAD_GROUP = "keypad";

function findGroupOf(model: PanelModelData, id: string | null): string | null {
  if (!id) return null;
  if (model.commands.some((c) => c.slug === id)) return KEYPAD_GROUP;
  const result = model.groups.find((g) => g.sections.some((s) => s.slug === id))?.slug ?? null;
  return result;
}

function NodeButton({ node, id, isCurrent, onPick }: { node: SectionDef | KeypadCommandDef; id: string; isCurrent: boolean; onPick: (id: string) => void }) {
  return (
    <li>
      <button type="button" className={isCurrent ? "is-current" : undefined} aria-current={isCurrent || undefined} onClick={() => onPick(id)}>
        <span className="code">{formatNodeCode(node)}</span>
        <span>{node.label}</span>
      </button>
    </li>
  );
}

// "Browse all menus": [*] commands, then every installer section by group. Collapses to a toggle on phones.
export function Tree({ model, currentId, onPick }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set([KEYPAD_GROUP]));
  const currentGroup = findGroupOf(model, currentId);

  // Like the legacy tree: the group holding the keypad's node opens itself.
  useEffect(() => {
    if (currentGroup) setOpenGroups((prev) => (prev.has(currentGroup) ? prev : new Set(prev).add(currentGroup)));
  }, [currentGroup]);

  function toggleGroup(slug: string, open: boolean) {
    setOpenGroups((prev) => {
      if (prev.has(slug) === open) return prev;
      const next = new Set(prev);
      if (open) next.add(slug); else next.delete(slug);
      return next;
    });
  }

  function pickNode(id: string) {
    setIsOpen(false);
    onPick(id);
  }

  return (
    <nav className={`tree${isOpen ? " is-open" : ""}`} aria-label="All menus">
      <button type="button" className="tree-toggle" aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)}>
        Browse all menus <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
      </button>
      <div className="tree-body">
        <h2>Keypad commands</h2>
        <details open={openGroups.has(KEYPAD_GROUP)} onToggle={(e) => toggleGroup(KEYPAD_GROUP, e.currentTarget.open)}>
          <summary>[*] commands</summary>
          <ul>
            {model.commands.map((c) => <NodeButton key={c.slug} node={c} id={c.slug} isCurrent={c.slug === currentId} onPick={pickNode} />)}
          </ul>
        </details>
        <h2>Installer programming [*][8]</h2>
        {model.groups.map((g) => (
          <details key={g.slug} open={openGroups.has(g.slug)} onToggle={(e) => toggleGroup(g.slug, e.currentTarget.open)}>
            <summary>{g.label}</summary>
            <ul>
              {g.sections.map((s) => <NodeButton key={s.slug} node={s} id={s.slug} isCurrent={s.slug === currentId} onPick={pickNode} />)}
            </ul>
          </details>
        ))}
      </div>
    </nav>
  );
}
