export default function PanelLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-56 rounded-lg bg-zinc-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 rounded-xl bg-zinc-200/70" />
        ))}
      </div>
      <div className="h-80 rounded-xl bg-zinc-200/70" />
    </div>
  );
}
