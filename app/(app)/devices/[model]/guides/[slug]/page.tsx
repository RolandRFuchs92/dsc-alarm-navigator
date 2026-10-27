import Link from "next/link";
import { notFound } from "next/navigation";
import { StepCard } from "@/components/guides/StepCard";
import { StepNav } from "@/components/guides/StepNav";
import { requireApprovedUser } from "@/lib/auth/guards";
import { getChosenKeypad, getGuide, getPanelModel } from "@/lib/content/repo";
import { clampStep } from "@/lib/guides/replay";
import { GuideRunner } from "./GuideRunner";
import styles from "./guide.module.css";

export const dynamic = "force-dynamic";

type Params = Promise<{ model: string; slug: string }>;
type Search = Promise<{ step?: string | string[] }>;

// /devices/pc1864/guides/create-partition?step=3: one step at a time, moved only by Back / Next.
export default async function GuidePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const user = await requireApprovedUser();
  const { model: modelSlug, slug } = await params;
  const { step } = await searchParams;
  const model = await getPanelModel(modelSlug);
  if (!model) notFound();
  const guide = await getGuide(model.slug, slug);
  if (!guide || !guide.steps.length) notFound();
  const number = clampStep(Array.isArray(step) ? step[0] : step, guide.steps.length);
  const keypad = await getChosenKeypad(user.id, model);
  const modelPath = `/devices/${model.slug}`;
  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <Link href={modelPath} className={styles.back}>{`‹ ${model.name}`}</Link>
        <h1 className={`page-title ${styles.title}`}>
          {guide.title}
          {guide.danger ? <span className="badge danger">Erases settings</span> : null}
          {guide.verified ? null : <span className="badge unverified">unverified</span>}
        </h1>
        {guide.summary ? <p className="page-lead">{guide.summary}</p> : null}
      </div>
      <div className={styles.body}>
        <StepCard step={guide.steps[number - 1]} number={number} count={guide.steps.length} modelSlug={model.slug} />
        <GuideRunner model={model} keypad={keypad} steps={guide.steps} stepIndex={number - 1} />
      </div>
      <StepNav number={number} count={guide.steps.length} basePath={`${modelPath}/guides/${guide.slug}`} doneHref={modelPath} />
    </main>
  );
}
