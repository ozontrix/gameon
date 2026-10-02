import { EmptyState } from "@/components/league/ui";

export default function LeagueNotFound() {
  return (
    <EmptyState
      emoji="🤔"
      title="Screen not found"
      copy="That sport or stage does not exist yet. Head back to the League home and pick a bracket."
      ctaLabel="League home"
      ctaHref="/gameon-multisports-league"
    />
  );
}
