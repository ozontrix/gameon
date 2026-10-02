import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SPORTS, findSport } from "@/components/olympics/data";
import { SportDetail } from "@/components/olympics/sport-detail";
import { pageMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';

/** Every sport is known up front, so the brackets can be pre-rendered. */
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
    title: `${data.name} — GameOn Olympics`, path: `/gameon-olympics/sports/${data.id}`,
    description: data.description,
  });
}

export default async function OlympicsSportPage({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  const data = findSport(sport);
  if (!data) notFound();

  return <><Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'GameOn Olympics', path: '/gameon-olympics' }, { name: 'Sports', path: '/gameon-olympics/sports' }, { name: data.name, path: `/gameon-olympics/sports/${data.id}` }]} /><SportDetail sportId={data.id} /></>;
}
