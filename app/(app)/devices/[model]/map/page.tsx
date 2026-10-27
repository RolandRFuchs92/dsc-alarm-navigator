import { requireApprovedUser } from "@/lib/auth/guards";
import { renderMap } from "./load-map";

export const dynamic = "force-dynamic";

type Params = Promise<{ model: string }>;
type Search = Promise<{ cmd?: string | string[] }>;

export default async function MapPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const user = await requireApprovedUser();
  const { model } = await params;
  const { cmd } = await searchParams;
  const result = await renderMap({ user, modelSlug: model, section: null, sub: null, cmd: typeof cmd === "string" ? cmd : null });
  return result;
}
