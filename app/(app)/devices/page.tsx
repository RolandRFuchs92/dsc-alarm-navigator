import Link from "next/link";
import { requireApprovedUser } from "@/lib/auth/guards";
import { listPanelModels } from "@/lib/content/repo";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  await requireApprovedUser();
  const models = await listPanelModels();
  return (
    <main className="page">
      <h1 className="page-title">Alarm panels</h1>
      <p className="page-lead">Pick your panel to see its programming guides and menu map.</p>
      <ul className="card-list">
        {models.map((m) => (
          <li key={m.slug}>
            <Link href={`/devices/${m.slug}`} className="card">
              <span className="card-title">{m.manufacturer} {m.name}</span>
              <span className="card-note">Firmware v{m.firmware}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
