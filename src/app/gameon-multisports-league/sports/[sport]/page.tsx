import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SPORTS, findSport, scheduleLabel } from "@/components/league/data";
import { LeagueSportDetail } from "@/components/league/sport-detail";

/** Every sport is known up front, so the category pages can be pre-rendered. */
export function generateStaticParams() {
  return SPORTS.map((sport) => ({ sport: sport.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sport: string }>;
}): Promise<Metadata> {
  const { sport } = await params;
  const data = findSport(sport);
  if (!data) return { title: "Sport not found" };
  return {
    title: `${data.name} — Categories, Dates & Fees`,
    description: `${data.description} ${scheduleLabel(data.categories)}. See all ${data.categories.length} categories, fixed match dates and entry fees for Game On Multisports League.`,
  };
}

export default async function MultisportsLeagueCategoryPage({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  const data = findSport(sport);
  if (!data) notFound();

  return <LeagueSportDetail key={data.id} sportId={data.id} />;
}
