/* The per-kind body of a section's detail: range picker, sub-sections, entries, lookups, phone, toggles.
   Ported from src/app.js renderRangePicker … renderToggleBody; wording kept word for word. */
import { describeInstance, formatSection, readEntries, readLookup, readOptions, readValueKey } from "@/lib/content/format";
import type { EntryDef, PanelModelData, SectionDef } from "@/lib/content/types";
import type { Focus, Worksheet } from "@/lib/engines/types";
import type { MapCopy } from "./copy";

// Row clicks; left out when the engine can't do them, and then the rows aren't clickable.
export type DetailActions = {
  pickNode: (id: string, num?: number) => void;
  pickSub?: (code: string) => void;
  pickEntry?: (index: number) => void;
  pickValue?: (code: string) => void;
  pickOption?: (n: number) => void;
};

export type BodyProps = {
  model: PanelModelData;
  copy: MapCopy;
  section: SectionDef;
  num: number;
  subCode: string | null;
  focus: Focus;
  worksheet: Worksheet;
  on: DetailActions;
};

// "clickable" only for rows the engine can act on; `extra` is the rest of the class list, starting with a space.
function buildRowClass(isClickable: boolean, extra: string): string | undefined {
  const result = `${isClickable ? "clickable" : ""}${extra}`.trim() || undefined;
  return result;
}

export function RangePicker({ section, num, on }: Pick<BodyProps, "section" | "num" | "on">) {
  const [first, last] = section.range!;
  const numbers = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  return (
    <>
      <h3>Pick which one</h3>
      <span className="picker-label">Each number below is its own section. {formatSection(num)} = {describeInstance(section, num)}.</span>
      <div className="picker">
        {numbers.map((n) => (
          <button key={n} type="button" className={n === num ? "is-current" : undefined} title={describeInstance(section, n)} onClick={() => on.pickNode(section.slug, n)}>{n}</button>
        ))}
      </div>
    </>
  );
}

export function SubBody(props: BodyProps) {
  const { section, subCode, on } = props;
  const sub = (section.subs ?? []).find((s) => s.code === subCode) ?? null;
  return (
    <>
      <h3>Sub-sections</h3>
      <div className="table-wrap"><table>
        <thead><tr><th className="num">Sub</th><th>What it is</th><th>Entries inside</th></tr></thead>
        <tbody>
          {(section.subs ?? []).map((s) => {
            const isCurrent = s.code === subCode;
            return (
              <tr key={s.code} className={buildRowClass(!!on.pickSub, isCurrent ? " is-current" : "")} onClick={on.pickSub ? () => on.pickSub!(s.code) : undefined}>
                <td className="num">[{s.code}]</td>
                <td>{s.label}{isCurrent ? <> <span className="here">keypad is here</span></> : null}</td>
                <td>{(s.entries ?? []).map((e) => e.label).join(", ")}</td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
      {sub ? <EntriesTable {...props} /> : null}
    </>
  );
}

function LookupTable({ model, lookupKey, current, on }: { model: PanelModelData; lookupKey: string; current: string | null; on: DetailActions }) {
  const lookup = readLookup(model, lookupKey);
  if (!lookup) return null;
  return (
    <>
      <h3>{lookup.title}: what to type</h3>
      {on.pickValue ? <span className="picker-label">Click a row to type that value into the current entry.</span> : null}
      <div className="table-wrap"><table>
        <thead><tr><th className="num">Value</th><th>Meaning</th></tr></thead>
        <tbody>
          {Object.keys(lookup.values).map((code) => (
            <tr key={code} className={buildRowClass(!!on.pickValue, code === current ? " is-current" : "")} onClick={on.pickValue ? () => on.pickValue!(code) : undefined}>
              <td className="num">{code}</td>
              <td>{lookup.values[code]}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}

export function EntriesTable({ model, section, num, subCode, focus, worksheet, on }: BodyProps) {
  const sub = (section.subs ?? []).find((s) => s.code === subCode) ?? null;
  const entries = readEntries(section, num, sub ? sub.code : null);
  const lookups = Array.from(new Set(entries.map((e) => e.lookup).filter((k): k is string => !!k)));
  const meaningOf = (e: EntryDef, v: string | undefined) => {
    const text = e.lookup && v ? readLookup(model, e.lookup)?.values[v] : undefined;
    const result = text ? <span className="meaning">{text}</span> : null;
    return result;
  };
  const currentEntry = focus.entryIndex !== null ? entries[focus.entryIndex] : undefined;
  const currentValue = focus.entryIndex !== null
    ? (focus.buffer || worksheet.values[readValueKey(num, sub ? sub.code : null, focus.entryIndex)] || currentEntry?.def || null)
    : null;
  return (
    <>
      <h3>{sub ? `Entries in [${sub.code}] ${sub.label}` : "Entries, in the order the keypad asks"}</h3>
      <div className="table-wrap"><table>
        <thead><tr><th className="num">#</th><th>Entry</th><th className="num">Digits</th><th className="num">Default</th><th className="num">Your entry</th></tr></thead>
        <tbody>
          {entries.map((e, i) => {
            const value = worksheet.values[readValueKey(num, sub ? sub.code : null, i)];
            const isCurrent = focus.entryIndex === i;
            return (
              <tr key={i} className={buildRowClass(!!on.pickEntry, isCurrent ? " is-current" : "")} onClick={on.pickEntry ? () => on.pickEntry!(i) : undefined}>
                <td className="num">{i + 1}</td>
                <td>{e.label}{e.note ? <span className="meaning">{e.note}</span> : null}{isCurrent ? <> <span className="here">keypad is here</span></> : null}</td>
                <td className="num">{e.variable ? "up to 32" : e.digits}</td>
                <td className="num">{e.def || ""}{meaningOf(e, e.def)}</td>
                <td className="num">{value !== undefined ? <>{value}{meaningOf(e, value)}</> : null}</td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
      {lookups.map((key) => <LookupTable key={key} model={model} lookupKey={key} current={currentValue} on={on} />)}
    </>
  );
}

const HEX_ROWS: Array<[string, string, string]> = [
  ["[*][1][*]", "A", "Not used"],
  ["[*][2][*]", "B", "Simulated [*] key"],
  ["[*][3][*]", "C", "Simulated [#] key"],
  ["[*][4][*]", "D", "Wait for dial tone"],
  ["[*][5][*]", "E", "2-second pause"],
  ["[*][6][*]", "F", "End of number"],
];

export function PhoneBody({ num, focus, worksheet }: BodyProps) {
  const value = focus.mode === "phone" ? focus.buffer : (worksheet.values[readValueKey(num, null, 0)] || "");
  return (
    <>
      <h3>Number</h3>
      <p className="desc"><span className="code">{value || "(empty)"}</span></p>
      <h3>HEX digits</h3>
      <div className="table-wrap"><table>
        <thead><tr><th className="num">Keys</th><th className="num">Digit</th><th>Meaning in a phone number</th></tr></thead>
        <tbody>
          {HEX_ROWS.map(([keys, digit, meaning]) => <tr key={digit}><td className="num">{keys}</td><td className="num">{digit}</td><td>{meaning}</td></tr>)}
        </tbody>
      </table></div>
    </>
  );
}

export function ToggleBody({ copy, section, num, worksheet, on }: BodyProps) {
  const options = readOptions(section, num);
  const saved = worksheet.toggles[String(num)];
  const set = new Set(saved ?? options.filter((o) => o.def).map((o) => o.n));
  return (
    <>
      <h3>Options</h3>
      <span className="picker-label">{copy.toggleHint}</span>
      <div className="table-wrap"><table>
        <thead><tr><th className="num">Opt</th><th>When ON</th><th>When OFF</th><th>Default</th><th>Yours</th></tr></thead>
        <tbody>
          {options.map((o) => {
            const isOn = set.has(o.n);
            const keyHint = o.n > 8 ? `[9] then [${o.n - 8}]` : `[${o.n}]`;
            return (
              <tr key={o.n} className={buildRowClass(!!on.pickOption, o.future ? " is-future" : "")} onClick={on.pickOption ? () => on.pickOption!(o.n) : undefined}>
                <td className="num">{o.n}{section.pages === 2 ? <span className="meaning">{keyHint}</span> : null}</td>
                <td>{o.on}</td>
                <td>{o.off || ""}</td>
                <td><span className={`pill ${o.def ? "on" : "off"}`}>{o.def ? "ON" : "OFF"}</span></td>
                <td><span className={`pill ${isOn ? "on" : "off"}`}>{isOn ? "ON" : "OFF"}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </>
  );
}
