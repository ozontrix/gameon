/** Entry numbers are Indian: strip formatting, take the last ten digits, add 91 once. */
export function leagueWhatsAppNumber(value: string | null | undefined): string | null {
  const digits = (value ?? '').replace(/\D/g, '');
  const local = digits.slice(-10);
  return digits.length >= 10 && /^[6-9]\d{9}$/.test(local) ? `91${local}` : null;
}

export function serviceWindowOpen(lastInbound: string | null | undefined, now = Date.now()): boolean {
  const time = lastInbound ? Date.parse(lastInbound) : NaN;
  return Number.isFinite(time) && time <= now && now - time < 86_400_000;
}

export type TemplateComponent = { type: string; format?: string; text?: string; buttons?: { type: string; url?: string }[] };
export type InboxTemplate = { id: string; name: string; language: string; status: string; category: string; components: TemplateComponent[] };
export type TemplateField = { component: string; key: string };

/** Only text templates/static buttons; never quietly omit required media/button parameters. */
export function templateFields(template: InboxTemplate): { fields: TemplateField[]; reason?: string } {
  const fields: TemplateField[] = [];
  if (template.status !== 'APPROVED' || !['UTILITY', 'MARKETING'].includes(template.category)) return { fields, reason: 'Only approved utility/marketing templates can be sent here.' };
  for (const component of template.components) {
    if (!['HEADER', 'BODY', 'FOOTER', 'BUTTONS'].includes(component.type)) return { fields, reason: 'This template needs an unsupported component.' };
    if (component.type === 'HEADER' && component.format !== 'TEXT') return { fields, reason: 'Media/location headers are not supported by this composer.' };
    if (component.type === 'BUTTONS' && component.buttons?.some(button => !['URL', 'PHONE_NUMBER', 'QUICK_REPLY'].includes(button.type) || /\{\{/.test(button.url ?? ''))) return { fields, reason: 'This template needs dynamic button parameters.' };
    const keys = [...new Set([...((component.text ?? '').matchAll(/\{\{\s*([a-zA-Z_0-9]+)\s*\}\}/g))].map(match => match[1]))];
    if (keys.length && !['HEADER', 'BODY'].includes(component.type)) return { fields, reason: 'Unsupported template variables.' };
    keys.sort((a, b) => /^\d+$/.test(a) && /^\d+$/.test(b) ? Number(a) - Number(b) : 0);
    fields.push(...keys.map(key => ({ component: component.type.toLowerCase(), key })));
  }
  return { fields };
}

export function personalize(text: string, recipient: { name: string; reference?: string | null }): string {
  return text.replace(/\{name\}/g, recipient.name || 'Player').replace(/\{reference\}/g, recipient.reference || '');
}

export type InboxContact = { phone: string; name: string; last_message_at: string; last_inbound_at: string | null; utility_consent_at: string | null; marketing_consent_at: string | null; consent_evidence: string | null; consent_recorded_by: string | null };
export type ChatMessage = { id: string; phone: string; direction: string; body: string; message_type: string; status: string; error_message: string | null; created_at: string; wa_message_id: string | null; payload: unknown };
export type LeagueRecipient = { id: string; name: string; phone: string | null; rawPhone: string; reference: string | null; amount: number };