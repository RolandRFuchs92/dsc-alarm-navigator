import Link from "next/link";
import { notFound } from "next/navigation";
import { KeypadPicker } from "@/components/keypads/KeypadPicker";
import { requireApprovedUser } from "@/lib/auth/guards";
import { getChosenKeypad, getPanelModel, listGuides } from "@/lib/content/repo";
import { chooseKeypad } from "./actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ model: string }>;

export default async function ModelPage({ params }: { params: Params }) {
  const current = await requireApprovedUser();
  const { model: slug } = await params;
  const model = await getPanelModel(slug);
  if (!model) notFound();
  const [guides, keypad] = await Promise.all([listGuides(slug), getChosenKeypad(current.id, model)]);
  return (
    <main className="page">
      <h1 className="page-title">{model.name}</h1>
      <p className="page-lead">Firmware v{model.firmware}</p>

      <Link href={`/devices/${slug}/map`} className="card card-primary">
        <span className="card-title">Menu map</span>
        <span className="card-note">Every keypad command and installer section, with a keypad you can press.</span>
      </Link>

      <h2 className="page-heading">Guides</h2>
      {guides.length ? (
        <ul className="card-list">
          {guides.map((g) => (
            <li key={g.slug}>
              <Link href={`/devices/${slug}/guides/${g.slug}`} className="card">
                <span className="card-title">
                  {g.title}
                  {g.danger ? <span className="badge danger">Erases settings</span> : null}
                  {g.verified ? null : <span className="badge unverified">unverified</span>}
                </span>
                <span className="card-note">{g.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="page-lead">No guides for this panel yet.</p>}

      <h2 className="page-heading">Your keypad</h2>
      <p className="page-lead">Pick the keypad on your wall. The map and the guides draw this one.</p>
      <KeypadPicker keypads={model.keypads} currentSlug={keypad.slug} action={chooseKeypad.bind(null, slug)} />
    </main>
  );
}
