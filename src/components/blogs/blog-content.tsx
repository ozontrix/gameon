import type { ReactNode } from 'react';
import { safeBlogHref } from '@/lib/blog';

/** A deliberately small Markdown subset. Raw HTML is always rendered as text. */
function inline(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return tokens.map((token, index) => {
    if (token.startsWith('**') && token.endsWith('**')) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith('`') && token.endsWith('`')) return <code key={index} className="rounded bg-white/10 px-1.5 py-0.5 text-sm">{token.slice(1, -1)}</code>;
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = safeBlogHref(link[2]);
      return href ? <a key={index} href={href} className="text-go-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-go-brand">{link[1]}</a> : link[1];
    }
    return token;
  });
}

export function BlogContent({ content }: { content: string }) {
  const blocks = content.replace(/\r\n?/g, '\n').trim().split(/\n\s*\n/);
  return <div className="space-y-6 break-words text-base leading-8 text-go-off/85">
    {blocks.map((block, index) => {
      const heading = block.match(/^(#{1,3})\s+([^\n]+)$/);
      if (heading) {
        const Heading = heading[1].length >= 3 ? 'h3' : 'h2';
        return <Heading key={index} className="pt-4 text-2xl font-semibold leading-snug text-go-white">{inline(heading[2])}</Heading>;
      }
      const lines = block.split('\n');
      if (lines.every(line => /^[-*]\s+/.test(line))) return <ul key={index} className="list-disc space-y-2 pl-6">{lines.map((line, i) => <li key={i}>{inline(line.replace(/^[-*]\s+/, ''))}</li>)}</ul>;
      if (lines.every(line => /^\d+\.\s+/.test(line))) return <ol key={index} className="list-decimal space-y-2 pl-6">{lines.map((line, i) => <li key={i}>{inline(line.replace(/^\d+\.\s+/, ''))}</li>)}</ol>;
      if (lines.every(line => /^>\s?/.test(line))) return <blockquote key={index} className="border-l-4 border-go-brand pl-5 italic">{inline(lines.map(line => line.replace(/^>\s?/, '')).join(' '))}</blockquote>;
      return <p key={index} className="whitespace-pre-line">{inline(block)}</p>;
    })}
  </div>;
}