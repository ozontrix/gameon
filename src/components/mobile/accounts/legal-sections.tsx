'use client';

/**
 * A numbered list of legal sections — the web twin of the handset app's
 * `components/accounts/legal-sections.tsx`, shared by the Privacy and Terms pages
 * so the two cannot drift apart.
 */

import { Brand, Spacing } from '@/lib/mobile/theme';

export function LegalSections({
  sections,
}: {
  sections: { title: string; body: string }[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.four }}>
      {sections.map((section, index) => (
        <div
          key={section.title}
          style={{ display: 'flex', flexDirection: 'column', gap: Spacing.two }}>
          <span style={{ color: Brand.text, fontSize: 16, fontWeight: 700 }}>
            {index + 1}. {section.title}
          </span>
          <span style={{ color: Brand.textSecondary, fontSize: 14, lineHeight: '21px' }}>
            {section.body}
          </span>
        </div>
      ))}
    </div>
  );
}
