import { CalendarDays } from "lucide-react";
import { categoryFeeUnit, formatDayLabel, formatINR } from "./data";

/** Reused on details, review, payment and the paid pass. */
export function CategorySchedule({
  categories,
  fallbackDate,
  onRemove,
}: {
  categories: { id: string; name: string; sportId?: string; sportName?: string; date?: string; fee?: number; squadSize?: number }[];
  fallbackDate?: string;
  onRemove?: (sportId: string, categoryId: string) => void;
}) {
  return (
    <ul className="space-y-2.5" aria-label="Selected categories and match dates">
      {categories.map((category) => (
        <li key={`${category.sportId ?? ""}:${category.id}`} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="min-w-0">
            {category.sportName ? <p className="mb-1 text-xs font-semibold text-go-brand">{category.sportName}</p> : null}
            <p className="text-sm font-semibold text-go-white">{category.name}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-go-brand">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {formatDayLabel(category.date ?? fallbackDate ?? null)}
            </p>
          </div>
          {category.fee !== undefined ? (
            <div className="shrink-0 text-right">
              <p className="font-mono text-sm font-semibold text-go-white">{formatINR(category.fee)}</p>
              {category.squadSize !== undefined ? (
                <p className="mt-0.5 text-[11px] text-go-off/70">per {categoryFeeUnit({ squadSize: category.squadSize })}</p>
              ) : null}
              {onRemove && category.sportId ? (
                <button type="button" onClick={() => onRemove(category.sportId!, category.id)}
                  aria-label={`Remove ${category.sportName} ${category.name}`}
                  className="mt-1 min-h-11 cursor-pointer text-xs font-semibold text-go-brand hover:text-go-white focus-visible:outline-2 focus-visible:outline-go-brand">
                  Remove
                </button>
              ) : null}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}