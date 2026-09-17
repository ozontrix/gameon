import Link from 'next/link';

import { buttonClass } from './ui';

/**
 * Previous / next links that keep every other query parameter (filters) intact.
 */
export function Pagination({
  basePath,
  params,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const href = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== 'page') query.set(key, value);
    }
    if (target > 1) query.set('page', String(target));
    const qs = query.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-zinc-600">
      <p>
        <span className="tabular-nums">
          {from}–{to}
        </span>{' '}
        of <span className="tabular-nums">{total}</span>
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={buttonClass('secondary', 'sm')}>
            Previous
          </Link>
        ) : (
          <span className={buttonClass('secondary', 'sm', 'pointer-events-none opacity-50')}>Previous</span>
        )}
        {page < pages ? (
          <Link href={href(page + 1)} className={buttonClass('secondary', 'sm')}>
            Next
          </Link>
        ) : (
          <span className={buttonClass('secondary', 'sm', 'pointer-events-none opacity-50')}>Next</span>
        )}
      </div>
    </nav>
  );
}

/** Reads `?page=` as a positive integer. */
export function pageFrom(value: string | string[] | undefined): number {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}
