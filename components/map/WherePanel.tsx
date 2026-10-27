import type { Focus, Location } from "@/lib/engines/types";

type Props = { location: Location; trail: Focus["trail"]; onCrumb: (target: string) => void };

// "You are here": crumbs, what the panel is waiting for, and the keys pressed to get here.
export function WherePanel({ location, trail, onCrumb }: Props) {
  return (
    <section className="panel where" aria-live="polite">
      <p className="eyebrow">You are here</p>
      <ol className="crumbs">
        {location.crumbs.map((c, i) => (
          <li key={`${i}-${c.label}`}>
            {c.target ? <button type="button" onClick={() => onCrumb(c.target!)}>{c.label}</button> : <span>{c.label}</span>}
          </li>
        ))}
      </ol>
      <p className="waiting">
        {location.waitingParts
          ? location.waitingParts.map((part, i) => (part.strong ? <strong key={i}>{part.text}</strong> : <span key={i}>{part.text}</span>))
          : location.waitingFor}
      </p>
      <p className="trail-label">Keys pressed to get here</p>
      <ol className="trail">
        {trail.length ? trail.map((c, i) => (
          <li key={`${i}-${c.key}`}>
            <span className="keycap">{c.key}</span>
            {c.label ? <small>{c.label}</small> : null}
          </li>
        )) : <li><small>Nothing pressed yet</small></li>}
      </ol>
      <p className="led-legend">
        <span><i className="dot armed" />Armed light on = waiting for a section number</span>
        <span><i className="dot ready" />Ready light on = waiting for data (flashing = HEX)</span>
      </p>
    </section>
  );
}
