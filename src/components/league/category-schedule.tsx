import { CalendarDays } from "lucide-react";
import { categoryFeeUnit, formatDayLabel, formatINR } from "./data";

/** Reused on details, review, payment and the paid pass. */
export function CategorySchedule({
  categories,
  fallbackDate,
}: {
  categories: { id: string; name: string; date?: string; fee?: number; squadSize?: number }[];
  fallbackDate?: string;
}) {
  return (
    <ul className="space-y-2.5" aria-label="Selected categories and match dates">
      {categories.map((category) => (
        <li key={category.id} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="min-w-0">
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
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}