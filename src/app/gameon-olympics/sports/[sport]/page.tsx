import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SPORTS, findSport } from "@/components/olympics/data";
import { SportDetail } from "@/components/olympics/sport-detail";

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
  if (!data) return { title: "Sport not found" };
  return {
    title: `${data.name} — Categories & Fees`,
    description: data.description,
  };
}

export default async function OlympicsSportPage({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  const data = findSport(sport);
  if (!data) notFound();

  return <SportDetail sportId={data.id} />;
}
