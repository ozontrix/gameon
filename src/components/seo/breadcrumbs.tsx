import Link from 'next/link';
import { breadcrumbData } from '@/lib/seo';
import { JsonLd } from './json-ld';

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return <>
    <JsonLd data={breadcrumbData(items)} />
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-go-off/75">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => <li key={item.path} className="flex items-center gap-2">
          {index > 0 ? <span aria-hidden>/</span> : null}
          {index === items.length - 1 ? <span aria-current="page">{item.name}</span> : <Link href={item.path} className="rounded hover:text-go-brand focus-visible:outline-2 focus-visible:outline-go-brand">{item.name}</Link>}
        </li>)}
      </ol>
    </nav>
  </>;
}