/* The detail pane: an overview at idle, installer help at "Enter Section", else the command or section.
   Ported from src/app.js renderDetail and friends; wording kept word for word. */
import type { ReactNode } from "react";
import { describeInstance, formatNodeCode, formatSection } from "@/lib/content/format";
import type { KeypadCommandDef, PanelModelData, SectionDef } from "@/lib/content/types";
import type { Focus, Location, Worksheet } from "@/lib/engines/types";
import type { MapCopy } from "./copy";
import { EntriesTable, PhoneBody, RangePicker, SubBody, ToggleBody } from "./SectionBodies";
import type { BodyProps, DetailActions } from "./SectionBodies";

type Props = {
  model: PanelModelData;
  copy: MapCopy;
  focus: Focus;
  location: Location;
  worksheet: Worksheet;
  sourceText: string;
  on: DetailActions;
};

// The [*][8] command itself shows installer help rather than its own page, like the legacy app.
const INSTALLER_COMMAND = "k8";

const KIND_BADGES: Record<SectionDef["kind"], string> = {
  sub: "Has sub-sections", data: "Type in values", toggle: "On/off options", phone: "Phone number", module: "Module menu", action: "Command",
};

function findNode(model: PanelModelData, id: string | null) {
  const command = model.commands.find((c) => c.slug === id);
  if (command) return { command, section: null, groupLabel: "" };
  for (const g of model.groups) {
    const section = g.sections.find((s) => s.slug === id);
    if (section) return { command: null, section, groupLabel: g.label };
  }
  const result = null;
  return result;
}

function Tips({ tips }: { tips: string[] | undefined }) {
  if (!tips || !tips.length) return null;
  return <ul className="tips">{tips.map((t) => <li key={t}>{t}</li>)}</ul>;
}

function Related({ model, ids, on }: { model: PanelModelData; ids: string[] | undefined; on: DetailActions }) {
  if (!ids || !ids.length) return null;
  return (
    <>
      <h3>Related</h3>
      <div className="related">
        {ids.map((id) => {
          const node = findNode(model, id);
          const target = node?.command ?? node?.section;
          return target ? (
            <button key={id} type="button" onClick={() => on.pickNode(id)}>
              <span className="code">{formatNodeCode(target)}</span>{target.label}
            </button>
          ) : null;
        })}
      </div>
    </>
  );
}

function KeypadOverview({ model, copy, sourceText, on }: Pick<Props, "model" | "copy" | "sourceText" | "on">) {
  return (
    <>
      <div className="detail-head"><h2>Keypad commands</h2>{copy.overviewBadge ? <span className="badge">{copy.overviewBadge}</span> : null}</div>
      <p className="desc">{copy.overviewDesc}</p>
      <h3>{copy.commandsHeading}</h3>
      <div className="table-wrap"><table>
        <thead><tr><th>Keys</th><th>What it opens</th></tr></thead>
        <tbody>
          {model.commands.map((c) => (
            <tr key={c.slug} className="clickable" onClick={() => on.pickNode(c.slug)}><td className="num">{formatNodeCode(c)}</td><td>{c.label}</td></tr>
          ))}
        </tbody>
      </table></div>
      <p className="source">{sourceText}</p>
    </>
  );
}

function InstallerHelp({ model, sourceText, on }: Pick<Props, "model" | "sourceText" | "on">) {
  return (
    <>
      <div className="detail-head"><h2>How installer programming works</h2><span className="badge">[*][8]</span></div>
      <p className="desc">Installer programming has two levels. At the top level the panel waits for a <strong>3-digit section number</strong> (Armed light on). Inside a section it waits for data (Ready light on). Some sections, like [000] and [005], have one more level: a sub-section number before the data.</p>
      <ul className="tips">
        <li>Press <strong>[#]</strong> to leave a section. Anything typed so far is saved.</li>
        <li>Press <strong>[#]</strong> again at &quot;Enter Section&quot; to leave installer programming.</li>
        <li>Data sections move on by themselves: a double beep after each entry, five beeps at the end.</li>
        <li>On/off sections: press 1-8 to flip options, then [#].</li>
        <li>HEX digits: press [*] then 1-6 for A-F, then [*] again to go back to numbers.</li>
      </ul>
      <h3>Section map</h3>
      <div className="table-wrap"><table>
        <thead><tr><th>Area</th><th>Sections</th></tr></thead>
        <tbody>
          {model.groups.map((g) => (
            <tr key={g.slug}>
              <td>{g.label}</td>
              <td className="num">
                {g.sections.map((s, i) => (
                  <span key={s.slug}>{i ? " " : ""}<button type="button" className="linklike" onClick={() => on.pickNode(s.slug)}>{formatNodeCode(s)}</button></span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <p className="source">{sourceText}</p>
    </>
  );
}

function CommandDetail({ model, command, sourceText, on }: Pick<Props, "model" | "sourceText" | "on"> & { command: KeypadCommandDef }) {
  const { entries, attributes, tips, related } = command.payload;
  return (
    <>
      <div className="detail-head"><span className="big-code">{formatNodeCode(command)}</span><h2>{command.label}</h2><span className="badge">Keypad command</span></div>
      <p className="desc">{command.description}</p>
      <Tips tips={tips} />
      {entries ? (
        <>
          <h3>Inside this menu</h3>
          <div className="table-wrap"><table>
            <thead><tr><th>Press</th><th>What it does</th></tr></thead>
            <tbody>{entries.map((e) => <tr key={e.label}><td className="num">{e.label}</td><td>{e.note}</td></tr>)}</tbody>
          </table></div>
        </>
      ) : null}
      {attributes ? (
        <>
          <h3>User attributes ([99] + user)</h3>
          <div className="table-wrap"><table>
            <thead><tr><th className="num">Light</th><th>When ON</th></tr></thead>
            <tbody>{attributes.map((a) => <tr key={a.n}><td className="num">{a.n}</td><td>{a.on}</td></tr>)}</tbody>
          </table></div>
        </>
      ) : null}
      <Related model={model} ids={related} on={on} />
      <p className="source">{sourceText}</p>
    </>
  );
}

function SectionDetail(props: BodyProps & { groupLabel: string; sourceText: string }) {
  const { model, section, num, groupLabel, sourceText, on } = props;
  const instance = describeInstance(section, num);
  const bodies: Record<SectionDef["kind"], () => ReactNode> = {
    sub: () => <SubBody {...props} />,
    data: () => <EntriesTable {...props} />,
    phone: () => <PhoneBody {...props} />,
    toggle: () => <ToggleBody {...props} />,
    module: () => null,
    action: () => null,
  };
  return (
    <>
      <div className="detail-head">
        <span className="big-code">{formatSection(num)}</span>
        <h2>{section.label}{instance ? `: ${instance}` : ""}</h2>
        <span className={`badge${section.danger ? " danger" : ""}`}>{section.danger ? "Erases settings" : KIND_BADGES[section.kind]}</span>
        {section.verified ? null : <span className="badge unverified" title="Not yet checked against the install guide or a real panel">unverified</span>}
      </div>
      <p className="desc">{section.description}</p>
      <Tips tips={section.tips} />
      {section.range ? <RangePicker section={section} num={num} on={on} /> : null}
      {bodies[section.kind]()}
      <Related model={model} ids={section.related} on={on} />
      <p className="source">Area: {groupLabel}. {sourceText}</p>
    </>
  );
}

export function DetailPanel({ model, copy, focus, location, worksheet, sourceText, on }: Props) {
  const node = findNode(model, focus.nodeId);
  let body: ReactNode;
  if (!node || node.command?.slug === INSTALLER_COMMAND) {
    // The installer help describes DSC programming; other panels show the overview instead.
    body = focus.isInstallerTop && copy.hasInstallerHelp
      ? <InstallerHelp model={model} sourceText={sourceText} on={on} />
      : <KeypadOverview model={model} copy={copy} sourceText={sourceText} on={on} />;
  } else if (node.command) {
    body = <CommandDetail model={model} command={node.command} sourceText={sourceText} on={on} />;
  } else {
    const num = location.sectionNum ?? node.section.num ?? node.section.range?.[0] ?? 0;
    body = (
      <SectionDetail
        model={model} copy={copy} section={node.section} num={num} subCode={location.subCode} focus={focus} worksheet={worksheet}
        groupLabel={node.groupLabel} sourceText={sourceText} on={on}
      />
    );
  }
  return <section className="panel detail">{body}</section>;
}
