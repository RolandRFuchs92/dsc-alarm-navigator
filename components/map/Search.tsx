"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import { searchSections } from "@/lib/content/search";
import type { SearchHit } from "@/lib/content/search";
import type { PanelModelData } from "@/lib/content/types";

type Props = { model: PanelModelData; onPick: (hit: SearchHit) => void };

// Search box with a dropdown of hits: arrows move, Enter opens, Esc clears.
export function Search({ model, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [isShown, setIsShown] = useState(false);
  const hits = searchSections(model, query);
  const hasQuery = query.trim() !== "";

  function chooseHit(index: number) {
    const hit = hits[index];
    if (!hit) return;
    setQuery("");
    setIsShown(false);
    onPick(hit);
  }

  function handleKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") { event.preventDefault(); chooseHit(active); return; }
    if (event.key === "Escape") { setQuery(""); setIsShown(false); return; }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    setActive((a) => (a + (event.key === "ArrowDown" ? 1 : -1) + hits.length) % Math.max(1, hits.length));
  }

  return (
    <div className="search" role="search">
      <input
        type="search"
        placeholder="Find a section: 105, entry delay, chime..."
        autoComplete="off"
        aria-label="Search sections and commands"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setActive(0); setIsShown(true); }}
        onKeyDown={handleKeys}
        onFocus={() => setIsShown(true)}
        onBlur={() => setTimeout(() => setIsShown(false), 150)}
      />
      <div className="search-results" hidden={!isShown || !hasQuery}>
        {hits.length ? hits.map((h, i) => (
          <button key={`${h.id}-${h.num}`} type="button" className={i === active ? "is-active" : undefined} onClick={() => chooseHit(i)}>
            <span className="code">{h.code}</span>
            <span>{h.label}</span>
          </button>
        )) : <p className="picker-label search-empty">No match. Try a number like 013 or a word like chime.</p>}
      </div>
    </div>
  );
}
