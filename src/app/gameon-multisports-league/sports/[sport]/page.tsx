import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SPORTS, findSport, scheduleLabel } from "@/components/league/data";
import { LeagueSportDetail } from "@/components/league/sport-detail";
import { pageMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';

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
  if (!data) notFound();
  return pageMetadata({
    title: `${data.id === "pickleball" ? "Pickleball Showdown" : data.name} — Multisports League`, path: `/gameon-multisports-league/sports/${data.id}`,
    description: data.id === "pickleball"
      ? `Pickleball Showdown · ${scheduleLabel(data.categories)}. Explore all 11 categories: beginner, intermediate and advanced singles; beginner, intermediate and open doubles; Parent and Child; and Split Category Doubles 35+.`
      : `${data.description} ${scheduleLabel(data.categories)}. See all ${data.categories.length} categories, fixed match dates and entry fees for Game On Multisports League.`,
  });
}

export default async function MultisportsLeagueCategoryPage({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  const data = findSport(sport);
  if (!data) notFound();

  return <><Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Multisports League', path: '/gameon-multisports-league' }, { name: data.name, path: `/gameon-multisports-league/sports/${data.id}` }]} /><LeagueSportDetail key={data.id} sportId={data.id} /></>;
}
