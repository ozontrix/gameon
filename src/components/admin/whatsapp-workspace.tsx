'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, RefreshCw, Users, Settings } from 'lucide-react';
import { Badge, Card, EmptyState, Field, Notice, buttonClass, inputClass, textareaClass } from './ui';
import { leagueWhatsAppNumber, personalize, serviceWindowOpen, templateFields, type ChatMessage, type InboxContact, type InboxTemplate, type LeagueRecipient } from '@/lib/whatsapp/inbox-shared';

const API = '/admin/whatsapp/api';
async function request<T>(query: string, data?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API}${query}`, { method: data ? 'POST' : 'GET', headers: data ? { 'Content-Type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined, cache: 'no-store', signal });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}
type Account = { configured: boolean; webhookConfigured: boolean; phoneNumberId?: string; wabaId?: string; version?: string; subscribedAppCount?: number | null; phone?: { display_phone_number?: string; verified_name?: string; quality_rating?: string; code_verification_status?: string }; templates: InboxTemplate[]; error?: string };
type Thread = { messages: ChatMessage[]; contact: InboxContact | null; optedOut: boolean; next: string | null };
type SendResult = { status: string; duplicate?: boolean; error?: string };
type Target = { phone?: string; leagueId?: string; name: string; reference?: string | null };
const date = (value: string) => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

function Composer({ templates, targets, disabled, onSent }: { templates: InboxTemplate[]; targets: Target[]; disabled?: boolean; onSent: () => void }) {
  const [kind, setKind] = useState<'text' | 'template'>('template');
  const [body, setBody] = useState('Hi {name}, ');
  const [templateId, setTemplateId] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedSignature, setConfirmedSignature] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ name: string; message: string }[]>([]);
  const [progress, setProgress] = useState('');
  const stop = useRef(false);
  useEffect(() => () => { stop.current = true; }, []);
  const batch = useRef<{ signature: string; id: string } | null>(null);
  const template = templates.find(item => item.id === templateId);
  const definition = template ? templateFields(template) : { fields: [], reason: undefined };
  const preview = template ? template.components.filter(component => component.text).map(component => (component.text ?? '').replace(/\{\{\s*([a-zA-Z_0-9]+)\s*\}\}/g, (_, key) => variables[`${component.type.toLowerCase()}.${key}`] || `{{${key}}}`)).join('\n\n') : '';
  const draftSignature = JSON.stringify({ targets, kind, body, templateId, variables });
  const canSend = !disabled && targets.length > 0 && confirmed && confirmedSignature === draftSignature && !busy && (kind === 'text' ? Boolean(body.trim()) : Boolean(template && !definition.reason && definition.fields.every(field => variables[`${field.component}.${field.key}`]?.trim())));
  async function send() {
    if (!canSend) return;
    setBusy(true); setResults([]); stop.current = false;
    // Preserve the batch ID on an identical retry so a lost response cannot double-send.
    const signature = JSON.stringify({ targets, kind, body, templateId, variables });
    if (batch.current?.signature !== signature) batch.current = { signature, id: crypto.randomUUID() };
    const completed: { name: string; message: string }[] = [];
    try {
      for (let index = 0; index < targets.length; index++) {
        if (stop.current) break;
        const target = targets[index];
        setProgress(`Processing ${index + 1} of ${targets.length}`);
        try {
          const result = await request<SendResult>('', { op: 'send', batchId: batch.current!.id, ...target, kind, body, templateId, variables });
          completed.push({ name: target.name, message: `${result.duplicate ? 'Already processed: ' : ''}${result.status}${result.error ? ` — ${result.error}` : ''}` });
          setResults([...completed]);
          // Stop a campaign when the provider/configuration fails; don't hammer every recipient.
          if (['failed', 'unknown'].includes(result.status)) { setProgress('Stopped after a provider failure/uncertain send. Inspect history before starting a new send.'); break; }
        } catch (error) {
          completed.push({ name: target.name, message: error instanceof Error ? error.message : 'Send failed.' });
          setResults([...completed]);
          if (!/consent|24-hour|opted out|ten-digit|partially paid/i.test(completed.at(-1)!.message)) { setProgress('Stopped after a service error. Inspect history before retrying.'); break; }
        }
        if (index === targets.length - 1) setProgress(`Finished ${targets.length} recipient(s). “Sent” means accepted by Meta, not delivered.`);
      }
      if (stop.current) setProgress('Stopped. Messages already processed were not recalled.');
      setConfirmed(false);
      onSent();
    } finally { setBusy(false); }
  }
  return <div className="space-y-4 border-t border-zinc-200 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-zinc-900">Compose · {targets.length} recipient(s)</h3><Badge tone="green">Personalize with {'{name}'} / {'{reference}'}</Badge></div>
    <Field label="Message type" htmlFor="wa-kind"><select id="wa-kind" className={inputClass} value={kind} disabled={busy} onChange={event => { setKind(event.target.value as typeof kind); setConfirmed(false); }}><option value="template">Approved template · utility / marketing</option><option value="text">Custom reply · open 24-hour window only</option></select></Field>
    {kind === 'text' ? <Field label="Message" htmlFor="wa-body" hint="Every recipient must have messaged this account within the last 24 hours. Otherwise use an approved template."><textarea id="wa-body" className={textareaClass} rows={4} maxLength={4096} disabled={busy} value={body} onChange={event => { setBody(event.target.value); setConfirmed(false); }} /></Field> : <>
      <Field label="Meta template" htmlFor="wa-template"><select id="wa-template" className={inputClass} value={templateId} disabled={busy} onChange={event => { setTemplateId(event.target.value); setVariables({}); setConfirmed(false); }}><option value="">Choose an approved template</option>{templates.filter(item => item.status === 'APPROVED').map(item => <option key={item.id} value={item.id} disabled={Boolean(templateFields(item).reason)}>{item.name} · {item.language} · {item.category}{templateFields(item).reason ? ' (unsupported components)' : ''}</option>)}</select></Field>
      {!templates.some(item => item.status === 'APPROVED' && !templateFields(item).reason) ? <p className="text-sm text-amber-800">No supported approved templates loaded. Create a text-only utility or marketing template in Meta, then refresh Account & templates. Image-header booking confirmations remain in the delivery log.</p> : null}
      {definition.fields.map(field => { const key = `${field.component}.${field.key}`; return <Field key={key} label={`Variable: ${key}`} htmlFor={`wa-var-${key}`}><input id={`wa-var-${key}`} className={inputClass} maxLength={500} value={variables[key] ?? ''} disabled={busy} onChange={event => { setVariables({ ...variables, [key]: event.target.value }); setConfirmed(false); }} placeholder={field.key.includes('name') ? '{name}' : 'Value, {name} or {reference}'} /></Field>; })}
    </>}
    <div className="rounded-lg bg-emerald-50 p-3"><p className="mb-1 text-xs font-semibold uppercase text-emerald-800">Preview · {targets[0]?.name || 'recipient'}</p><p className="whitespace-pre-wrap break-words text-sm text-zinc-900">{personalize(kind === 'text' ? body : preview || 'Select a template to preview.', targets[0] ?? { name: 'Player' })}</p></div>
    <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-700"><input type="checkbox" className="mt-1 size-4" checked={confirmed && confirmedSignature === draftSignature} disabled={busy} onChange={event => { setConfirmed(event.target.checked); setConfirmedSignature(draftSignature); }} /><span>I reviewed the recipient list and preview. I have permission for this message and will use templates only for their approved purpose. Meta charges may apply.</span></label>
    <div className="flex flex-wrap gap-2"><button type="button" className={buttonClass('primary')} disabled={!canSend} onClick={send}><Send className="mr-2 size-4" />{busy ? 'Sending…' : `Send to ${targets.length} recipient(s)`}</button>{busy ? <button type="button" className={buttonClass('secondary')} onClick={() => { stop.current = true; }}>Stop after current message</button> : null}</div>
    <div aria-live="polite" className="text-sm text-zinc-700">{progress}</div>
    {results.length ? <ul className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 p-3 text-sm">{results.map((result, index) => <li key={index}><strong>{result.name}:</strong> {result.message}</li>)}</ul> : null}
    <p className="text-xs text-zinc-500">Keep this page open during bulk sending. No automatic resend on timeout; identical retries are deduplicated. Duplicate phone numbers receive one message per batch.</p>
  </div>;
}

export function WhatsAppWorkspace({ initialPhone, initialTab }: { initialPhone?: string; initialTab: 'inbox' | 'bulk' }) {
  const [tab, setTab] = useState<'inbox' | 'bulk' | 'account'>(initialTab);
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState('');
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [contacts, setContacts] = useState<InboxContact[]>([]);
  const [contactPage, setContactPage] = useState(1);
  const [contactTotal, setContactTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [newPhone, setNewPhone] = useState('');
  const [threadData, setThreadData] = useState<{ phone: string; value: Thread } | null>(null);
  const thread = threadData?.phone === phone ? threadData.value : null;
  const [threadLoading, setThreadLoading] = useState(false);
  const [league, setLeague] = useState<LeagueRecipient[]>([]);
  const [leaguePage, setLeaguePage] = useState(1);
  const [leagueTotal, setLeagueTotal] = useState(0);
  const [leagueSearch, setLeagueSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, LeagueRecipient>>({});
  const [selecting, setSelecting] = useState(false);
  const [consentCategory, setConsentCategory] = useState('UTILITY');
  const [evidence, setEvidence] = useState('');
  const [savingConsent, setSavingConsent] = useState(false);
  const phoneRef = useRef(phone);
  useEffect(() => { phoneRef.current = phone; }, [phone]);
  const templates = account?.templates ?? [];
  const showError = (value: unknown) => setError(value instanceof Error ? value.message : 'Request failed.');
  const loadAccount = useCallback(async () => {
    setLoadingAccount(true);
    try { setAccount(await request<Account>('?op=account')); } catch (error) { showError(error); } finally { setLoadingAccount(false); }
  }, []);
  const refresh = useCallback(async () => {
    const current = phoneRef.current;
    try {
      const result = await request<{ contacts: InboxContact[]; total: number }>(`?page=${contactPage}&q=${encodeURIComponent(search)}`);
      setContacts(result.contacts); setContactTotal(result.total);
      if (current) {
        const result = await request<Thread>(`?op=messages&phone=${current}`);
        if (phoneRef.current === current) setThreadData(previous => {
          if (previous?.phone !== current || previous.value.messages.length <= 50) return { phone: current, value: result };
          const merged = [...new Map([...previous.value.messages, ...result.messages].map(message => [message.id, message])).values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
          return { phone: current, value: { ...result, messages: merged, next: previous.value.next } };
        });
      }
    } catch (error) { showError(error); }
  }, [contactPage, search]);
  useEffect(() => { const timer = setTimeout(() => void loadAccount(), 0); return () => clearTimeout(timer); }, [loadAccount]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      request<{ contacts: InboxContact[]; total: number }>(`?page=${contactPage}&q=${encodeURIComponent(search)}`, undefined, controller.signal).then(result => { setContacts(result.contacts); setContactTotal(result.total); }).catch(error => { if (error.name !== 'AbortError') showError(error); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [contactPage, search]);
  useEffect(() => {
    if (tab !== 'inbox') return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 10_000);
    return () => clearInterval(timer);
  }, [tab, refresh]);
  useEffect(() => {
    if (!phone) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setThreadLoading(true); setEvidence('');
      request<Thread>(`?op=messages&phone=${phone}`, undefined, controller.signal).then(value => setThreadData({ phone, value })).catch(error => { if (error.name !== 'AbortError') showError(error); }).finally(() => { if (!controller.signal.aborted) setThreadLoading(false); });
    }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [phone]);
  useEffect(() => {
    if (tab !== 'bulk') return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      request<{ recipients: LeagueRecipient[]; total: number }>(`?op=league&page=${leaguePage}&q=${encodeURIComponent(leagueSearch)}`, undefined, controller.signal).then(result => { setLeague(result.recipients); setLeagueTotal(result.total); }).catch(error => { if (error.name !== 'AbortError') showError(error); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [tab, leaguePage, leagueSearch]);
  async function selectAll() {
    setSelecting(true);
    try {
      const entries: Record<string, LeagueRecipient> = {};
      for (let page = 1; ; page++) {
        const result = await request<{ recipients: LeagueRecipient[]; total: number }>(`?op=league&page=${page}&q=${encodeURIComponent(leagueSearch)}`);
        for (const row of result.recipients) if (row.phone) entries[row.id] = row;
        if (page * 100 >= result.total || !result.recipients.length) break;
      }
      setSelected(entries);
    } catch (error) { showError(error); } finally { setSelecting(false); }
  }
  async function older() {
    if (!thread?.next) return;
    const current = phone;
    try {
      const result = await request<Thread>(`?op=messages&phone=${phone}&before=${encodeURIComponent(thread.next)}`);
      if (phoneRef.current === current) setThreadData(previous => ({ phone: current, value: previous?.phone === current ? { ...previous.value, messages: [...result.messages, ...previous.value.messages], next: result.next } : result }));
    } catch (error) { showError(error); }
  }
  async function saveConsent() {
    setSavingConsent(true); setError('');
    try {
      await request('', { op: 'consent', phone, category: consentCategory, evidence });
      setEvidence(''); await refresh();
    } catch (error) { showError(error); } finally { setSavingConsent(false); }
  }
  const uniqueSelected = [...new Map(Object.values(selected).filter(row => row.phone).map(row => [row.phone, row])).values()];
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-3" role="navigation" aria-label="WhatsApp sections">{([{ id: 'inbox', label: 'Inbox', icon: MessageCircle }, { id: 'bulk', label: 'Bulk messages', icon: Users }, { id: 'account', label: 'Account & templates', icon: Settings }] as const).map(item => <button key={item.id} type="button" aria-current={tab === item.id ? 'page' : undefined} className={buttonClass(tab === item.id ? 'primary' : 'secondary')} onClick={() => setTab(item.id)}><item.icon className="mr-2 size-4" />{item.label}</button>)}<button type="button" className={buttonClass('ghost')} disabled={loadingAccount} onClick={() => { setError(''); void refresh(); void loadAccount(); }}><RefreshCw className="mr-2 size-4" />Refresh</button></div>
    {error ? <div role="alert"><Notice tone="danger" title="Action needed">{error}</Notice></div> : null}
    {account?.error ? <Notice tone="warning" title="Meta connection">{account.error}</Notice> : null}
    {account?.subscribedAppCount === 0 ? <Notice tone="danger" title="No app subscribed to this WABA">Meta reports zero subscribed apps. Subscribe your Meta app to this WhatsApp Business account and its messages webhook before expecting incoming messages or delivery receipts.</Notice> : null}
    {account?.phone?.code_verification_status && account.phone.code_verification_status !== 'VERIFIED' ? <Notice tone="warning" title="Sender verification needs attention">Meta reports {account.phone.code_verification_status}. Review the phone number registration/verification in WhatsApp Manager before live sending.</Notice> : null}
    {account && !account.webhookConfigured ? <Notice tone="warning" title="Inbound setup required">Set WHATSAPP_APP_SECRET and WHATSAPP_VERIFY_TOKEN, verify the callback, and subscribe the WABA to messages. Without inbound webhooks, replies and delivery status cannot appear.</Notice> : null}
    {tab === 'inbox' ? <>
      <p className="text-sm text-zinc-500">History starts with messages captured by this integration. Automatic booking confirmations are in the booking delivery log. Refreshes every 10 seconds while visible.</p>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card><div className="space-y-3 border-b border-zinc-200 p-4"><Field label="Search conversations" htmlFor="wa-search"><input id="wa-search" className={inputClass} value={search} onChange={event => { setSearch(event.target.value); setContactPage(1); }} placeholder="Name or mobile number" /></Field><form className="flex gap-2" onSubmit={event => { event.preventDefault(); const normalized = leagueWhatsAppNumber(newPhone); if (!normalized) return setError('Enter a valid Indian mobile number.'); setPhone(normalized); }}><label className="sr-only" htmlFor="wa-new-phone">Open phone number</label><input id="wa-new-phone" className={inputClass} value={newPhone} onChange={event => setNewPhone(event.target.value)} placeholder="+91 or 10-digit mobile" /><button className={buttonClass('secondary')}>Open</button></form></div>
          <div className="max-h-[560px] overflow-y-auto">{contacts.length ? contacts.map(contact => <button key={contact.phone} type="button" onClick={() => setPhone(contact.phone)} className={`block min-h-16 w-full cursor-pointer border-b border-zinc-100 p-4 text-left transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-emerald-600 ${phone === contact.phone ? 'bg-emerald-50' : ''}`}><span className="block truncate text-sm font-semibold text-zinc-900">{contact.name || `+${contact.phone}`}</span><span className="block text-xs text-zinc-500">+{contact.phone} · {date(contact.last_message_at)}</span></button>) : <EmptyState title="No conversations" description="Incoming customer messages appear after webhook setup. You can also open a phone number above." />}</div>
          <div className="flex items-center justify-between p-3 text-xs text-zinc-500"><button className={buttonClass('ghost', 'sm')} disabled={contactPage === 1} onClick={() => setContactPage(contactPage - 1)}>Previous</button><span>{contactPage} / {Math.max(1, Math.ceil(contactTotal / 50))}</span><button className={buttonClass('ghost', 'sm')} disabled={contactPage * 50 >= contactTotal} onClick={() => setContactPage(contactPage + 1)}>Next</button></div>
        </Card>
        <Card>{phone ? <>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 p-4"><div><h2 className="font-semibold text-zinc-950">{thread?.contact?.name || `+${phone}`}</h2><p className="text-sm text-zinc-500">+{phone}</p></div><Badge tone={thread?.optedOut ? 'red' : serviceWindowOpen(thread?.contact?.last_inbound_at) ? 'green' : 'amber'}>{thread?.optedOut ? 'Opted out · sending blocked' : serviceWindowOpen(thread?.contact?.last_inbound_at) ? '24-hour reply window open' : 'Template required'}</Badge></div>
          <div className="max-h-[520px] min-h-64 space-y-3 overflow-y-auto bg-zinc-50 p-4" aria-label="Message history">{threadLoading ? <p role="status">Loading conversation…</p> : null}{thread?.next ? <button type="button" className={buttonClass('secondary', 'sm')} onClick={older}>Load older messages</button> : null}{thread && !thread.messages.length ? <EmptyState title="No captured messages yet" description="You can start with an approved template after recording consent, or wait for this customer to message you." /> : null}{thread?.messages.map(message => <div key={message.id} className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[90%] rounded-xl p-3 text-sm shadow-sm sm:max-w-[80%] ${message.direction === 'outbound' ? 'bg-emerald-100' : 'border border-zinc-200 bg-white'}`}><p className="whitespace-pre-wrap break-words text-zinc-900">{message.body}</p>{message.message_type !== 'text' && message.direction === 'inbound' ? <details className="mt-2"><summary className="cursor-pointer text-xs">Message details (media not downloaded)</summary><pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(message.payload, null, 2)}</pre></details> : null}<p className="mt-2 text-[11px] text-zinc-600">{date(message.created_at)} · {message.status}</p>{message.error_message ? <p className="mt-1 text-xs text-red-800">{message.error_message}</p> : null}</div></div>)}</div>
          <details className="border-t border-zinc-200 p-4"><summary className="cursor-pointer text-sm font-medium">Messaging permission · utility {thread?.contact?.utility_consent_at ? 'recorded' : 'not recorded'} / marketing {thread?.contact?.marketing_consent_at ? 'recorded' : 'not recorded'}</summary><div className="mt-3 space-y-3"><p className="text-xs text-zinc-500">Record permission actually obtained from this customer. Paid entry or QR-delivery permission does not automatically authorize marketing. STOP cannot be overridden here.</p>{thread?.contact?.consent_evidence ? <p className="text-sm">Last evidence: {thread.contact.consent_evidence}</p> : null}<Field label="Permission category" htmlFor="wa-consent-category"><select id="wa-consent-category" className={inputClass} value={consentCategory} onChange={event => setConsentCategory(event.target.value)}><option value="UTILITY">Utility / booking updates</option><option value="MARKETING">Marketing / promotions</option></select></Field><Field label="Evidence / source and date of opt-in" htmlFor="wa-consent"><textarea id="wa-consent" className={textareaClass} maxLength={1000} value={evidence} onChange={event => setEvidence(event.target.value)} placeholder="How and when this customer agreed to these messages" /></Field><button type="button" disabled={savingConsent || Boolean(thread?.optedOut) || evidence.trim().length < 10} className={buttonClass('secondary')} onClick={saveConsent}>{savingConsent ? 'Saving…' : 'Record obtained consent'}</button></div></details>
          <Composer key={phone} templates={templates} targets={[{ phone, name: thread?.contact?.name || 'Player' }]} disabled={!account?.configured || !thread || thread.optedOut} onSent={() => void refresh()} />
        </> : <EmptyState title="Your WhatsApp inbox" description="Select a conversation or open a mobile number to view history and compose a message." />}</Card>
      </div>
    </> : null}
    {tab === 'bulk' ? <Card>
      <div className="space-y-4 p-4"><div><h2 className="font-semibold text-zinc-950">League recipients · paid and partially paid</h2><p className="mt-1 text-sm text-zinc-500">Confirmed entries with captured payment only. Numbers use the last ten digits, with 91 added once. Invalid numbers cannot be selected. Consent and STOP are checked again on the server for every send.</p></div>
        <Field label="Search eligible entries" htmlFor="wa-league-search"><input id="wa-league-search" className={inputClass} value={leagueSearch} onChange={event => { setLeagueSearch(event.target.value); setLeaguePage(1); }} placeholder="Name, phone or reference" /></Field>
        <div className="flex flex-wrap items-center gap-2"><button className={buttonClass('secondary', 'sm')} disabled={selecting} onClick={() => setSelected(previous => ({ ...previous, ...Object.fromEntries(league.filter(row => row.phone).map(row => [row.id, row])) }))}>Select this page</button><button className={buttonClass('secondary', 'sm')} disabled={selecting} onClick={selectAll}>{selecting ? 'Loading recipients…' : 'Select all matching entries'}</button><button className={buttonClass('ghost', 'sm')} onClick={() => setSelected({})}>Clear selection</button><span className="text-sm text-zinc-600">{Object.keys(selected).length} entries · {uniqueSelected.length} unique numbers</span></div>
        <div className="max-h-96 divide-y divide-zinc-100 overflow-y-auto rounded-lg border border-zinc-200">{league.map(row => <div key={row.id} className="flex items-center gap-3 p-3"><label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"><input type="checkbox" className="size-4 shrink-0" aria-label={`Select ${row.name} ${row.reference || row.id}`} disabled={!row.phone} checked={Boolean(selected[row.id])} onChange={event => setSelected(previous => { const next = { ...previous }; if (event.target.checked) next[row.id] = row; else delete next[row.id]; return next; })} /><span className="min-w-0 text-sm"><strong className="block truncate text-zinc-900">{row.name}</strong><span className="text-zinc-500">{row.reference || row.id.slice(0, 8)} · {row.phone ? `+${row.phone}` : `Invalid number: ${row.rawPhone}`} · ₹{row.amount} paid</span></span></label>{row.phone ? <button type="button" className={buttonClass('ghost', 'sm')} onClick={() => { setPhone(row.phone!); setTab('inbox'); }}>Chat / consent</button> : null}</div>)}{!league.length ? <EmptyState title="No eligible entries found" /> : null}</div>
        <div className="flex items-center justify-between"><button className={buttonClass('secondary', 'sm')} disabled={leaguePage === 1} onClick={() => setLeaguePage(leaguePage - 1)}>Previous</button><p className="text-xs text-zinc-500">Page {leaguePage} / {Math.max(1, Math.ceil(leagueTotal / 100))} · {leagueTotal} entries</p><button className={buttonClass('secondary', 'sm')} disabled={leaguePage * 100 >= leagueTotal} onClick={() => setLeaguePage(leaguePage + 1)}>Next</button></div>
        {uniqueSelected.length ? <details><summary className="cursor-pointer text-sm">Review selected recipients ({uniqueSelected.length})</summary><ul className="mt-2 max-h-40 overflow-auto text-sm">{uniqueSelected.map(row => <li key={row.phone}>{row.name} · +{row.phone}</li>)}</ul></details> : null}
      </div>
      <Composer templates={templates} targets={uniqueSelected.map(row => ({ leagueId: row.id, name: row.name, reference: row.reference }))} disabled={!account?.configured || selecting} onSent={() => void refresh()} />
    </Card> : null}
    {tab === 'account' ? <div className="space-y-4"><Card><div className="space-y-3 p-5"><h2 className="font-semibold text-zinc-950">Meta WhatsApp Business account</h2><p className="text-sm text-zinc-600">Credentials stay in server environment variables, never in this browser. This is a Cloud API workspace, not an embedded WhatsApp Web session.</p><dl className="grid gap-3 text-sm sm:grid-cols-2">{[['Connection', account?.phone ? 'Sender verified by Meta lookup' : 'Not verified'], ['Business name', account?.phone?.verified_name], ['Sender', account?.phone?.display_phone_number], ['Quality', account?.phone?.quality_rating], ['Phone number ID', account?.phoneNumberId], ['WABA ID', account?.wabaId], ['API version', account?.version], ['Webhook secrets', account?.webhookConfigured ? 'Configured; verify subscription in Meta' : 'Missing']].map(([label, value]) => <div key={label}><dt className="text-zinc-500">{label}</dt><dd className="break-words font-medium text-zinc-950">{value || 'Not available'}</dd></div>)}</dl><p className="break-all text-xs text-zinc-500">Callback: /api/v1/webhooks/whatsapp · subscribe to messages. Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_WABA_ID, WHATSAPP_APP_SECRET and WHATSAPP_VERIFY_TOKEN in hosting settings. Tokens need messaging and account-management permissions.</p></div></Card><Card><div className="p-5"><h2 className="mb-3 font-semibold text-zinc-950">Account templates ({templates.length})</h2><p className="mb-4 text-sm text-zinc-500">Templates are created and approved in Meta. This composer supports text headers/bodies and static buttons; media/dynamic-button templates stay visible but cannot be sent here.</p><div className="space-y-3">{templates.map(template => <div key={template.id} className="rounded-lg border border-zinc-200 p-3"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-zinc-900">{template.name}</strong><Badge tone={template.status === 'APPROVED' ? 'green' : 'amber'}>{template.status}</Badge><span className="text-xs text-zinc-500">{template.language} · {template.category}</span></div><p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">{template.components.filter(component => component.text).map(component => component.text).join('\n')}</p>{templateFields(template).reason ? <p className="mt-2 text-xs text-amber-800">{templateFields(template).reason}</p> : null}</div>)}</div></div></Card></div> : null}
  </div>;
}