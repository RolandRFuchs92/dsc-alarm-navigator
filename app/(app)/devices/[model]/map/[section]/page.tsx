import { requireApprovedUser } from "@/lib/auth/guards";
import { renderMap } from "../load-map";

export const dynamic = "force-dynamic";

type Params = Promise<{ model: string; section: string }>;
type Search = Promise<{ sub?: string | string[] }>;

// /devices/pc1864/map/005?sub=02 replaces the legacy #s005 hash links.
export default async function MapSectionPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const user = await requireApprovedUser();
  const { model, section } = await params;
  const { sub } = await searchParams;
  const result = await renderMap({ user, modelSlug: model, section, sub: typeof sub === "string" ? sub : null, cmd: null });
  return result;
}
