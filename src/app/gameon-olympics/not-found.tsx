import { EmptyState } from "@/components/olympics/ui";

export default function OlympicsNotFound() {
  return (
    <EmptyState
      emoji="🤔"
      title="Screen not found"
      copy="That sport or stage does not exist yet. Head back to the Olympics home and pick a bracket."
      ctaLabel="Olympics home"
      ctaHref="/gameon-olympics"
    />
  );
}
