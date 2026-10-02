"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Loader2, Mail, Send, ShieldCheck } from "lucide-react";
import { ACCOUNT_DELETION_EMAIL, AccountDeletionSchema, deletionReplyEmail } from "@/lib/account-deletion";

const inputClass = "w-full rounded-2xl border border-white/15 bg-go-black px-4 py-3 text-base text-go-white placeholder:text-go-off/50 focus-visible:border-go-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-go-brand aria-invalid:border-red-400";
const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-go-brand";

type Receipt = { reference: string; copySent: boolean; email: string };

export function DeleteAccountForm() {
  const [accountType, setAccountType] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [receiptEmail, setReceiptEmail] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const sending = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const showErrors = (fields: Record<string, string>) => {
    setErrors(fields);
    const first = Object.keys(fields)[0];
    const element = first ? formRef.current?.elements.namedItem(first) : null;
    if (element instanceof HTMLElement) element.focus();
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || receipt) return;
    setError("");
    const website = new FormData(event.currentTarget).get("website") ?? "";
    const parsed = AccountDeletionSchema.safeParse({ accountType, identifier, receiptEmail, message, consent, website });
    if (!parsed.success) {
      showErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])));
      return;
    }
    setErrors({});
    sending.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/delete-account", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        if (data.fields) showErrors(data.fields);
        setError(data.error ?? "We could not send your request. Please try again.");
        return;
      }
      setReceipt({ reference: data.reference, copySent: data.copySent, email: deletionReplyEmail(parsed.data) });
      // Remove sensitive form contents after successful submission; never persist them.
      setIdentifier(""); setReceiptEmail(""); setMessage(""); setConsent(false);
    } catch {
      setError("We could not confirm delivery. Please check your inbox before retrying, or contact our support team.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  if (receipt) {
    return (
      <section role="status" tabIndex={-1} ref={(element) => { element?.focus(); }} className="rounded-3xl border border-emerald-400/30 bg-emerald-400/[0.06] p-6 sm:p-8 focus:outline-none" aria-labelledby="request-sent-title">
        <CheckCircle2 className="h-10 w-10 text-emerald-300" aria-hidden />
        <h2 id="request-sent-title" className="mt-4 font-display text-2xl text-go-white">Request submitted</h2>
        <p className="mt-3 text-sm leading-relaxed text-go-off/80">Your deletion request has been sent to our support team. Your account has not been deleted yet. We may contact you to verify that the account belongs to you before processing the request.</p>
        <div className="mt-5 rounded-2xl border border-white/10 bg-go-black/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-go-off/70">Your request reference</p>
          <p className="mt-2 break-all font-mono text-sm text-go-white">{receipt.reference}</p>
        </div>
        <div className="mt-5 flex items-start gap-3 text-sm leading-relaxed text-go-off/80">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-go-brand" aria-hidden />
          <p>{receipt.copySent ? <>A copy was sent to <strong className="break-all text-go-white">{receipt.email}</strong>. Please check your spam folder too.</> : <>Your request reached our team, but we couldn&apos;t send your email copy. Save the reference above and contact support if you need a copy. There&apos;s no need to submit again.</>}</p>
        </div>
        <Link href="/" className={`mt-6 inline-flex min-h-11 items-center rounded-full bg-go-brand px-6 py-3 text-sm font-bold text-go-black transition-colors hover:bg-go-brand/90 ${focusClass}`}>Back to home</Link>
      </section>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-8" aria-busy={busy}>
      <div className="mb-6 flex items-start gap-3">
        <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-go-brand" aria-hidden />
        <div><h2 className="font-display text-xl text-go-white">Request account deletion</h2><p className="mt-1 text-sm leading-relaxed text-go-off/75">No sign-in needed. All fields below are required.</p></div>
      </div>
      <fieldset disabled={busy} className="space-y-6 disabled:opacity-70">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-go-white">Identify your account using</legend>
          <div className="grid grid-cols-2 gap-3">
            {([ ["email", "Email address"], ["phone", "Phone number"] ] as const).map(([value, label]) => (
              <label key={value} className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-2xl border p-3 text-sm transition-colors ${accountType === value ? "border-go-brand/60 bg-go-brand/10 text-go-white" : "border-white/15 text-go-off/80 hover:border-white/30"}`}>
                <input type="radio" name="accountType" value={value} checked={accountType === value} onChange={() => { setAccountType(value); setIdentifier(""); setErrors({}); setError(""); }} className={`h-4 w-4 accent-go-brand ${focusClass}`} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="identifier" className="mb-2 block text-sm font-semibold text-go-white">{accountType === "email" ? "Email linked to your account" : "Phone linked to your account"}</label>
          <input id="identifier" name="identifier" type={accountType === "email" ? "email" : "tel"} autoComplete={accountType === "email" ? "email" : "tel"} inputMode={accountType === "email" ? "email" : "tel"} value={identifier} onChange={(event) => setIdentifier(event.target.value)} maxLength={254} required aria-invalid={Boolean(errors.identifier)} aria-describedby={`identifier-hint${errors.identifier ? " identifier-error" : ""}`} className={inputClass} placeholder={accountType === "email" ? "you@example.com" : "+91 98765 43210"} />
          <p id="identifier-hint" className="mt-2 text-xs leading-relaxed text-go-off/70">{accountType === "email" ? "We will send a copy of your request to this email address." : "Use the number registered with Game On. Include your country code if needed."}</p>
          {errors.identifier ? <p id="identifier-error" className="mt-2 text-sm text-red-300">{errors.identifier}</p> : null}
        </div>

        {accountType === "phone" ? (
          <div>
            <label htmlFor="receiptEmail" className="mb-2 block text-sm font-semibold text-go-white">Email for your request copy</label>
            <input id="receiptEmail" name="receiptEmail" type="email" inputMode="email" autoComplete="email" value={receiptEmail} onChange={(event) => setReceiptEmail(event.target.value)} required maxLength={254} aria-invalid={Boolean(errors.receiptEmail)} aria-describedby={`receiptEmail-hint${errors.receiptEmail ? " receiptEmail-error" : ""}`} className={inputClass} placeholder="you@example.com" />
            <p id="receiptEmail-hint" className="mt-2 text-xs leading-relaxed text-go-off/70">An email you can access. It does not need to be linked to your phone-based account.</p>
            {errors.receiptEmail ? <p id="receiptEmail-error" className="mt-2 text-sm text-red-300">{errors.receiptEmail}</p> : null}
          </div>
        ) : null}

        <div>
          <label htmlFor="message" className="mb-2 block text-sm font-semibold text-go-white">Your deletion request</label>
          <textarea id="message" name="message" rows={5} value={message} onChange={(event) => setMessage(event.target.value)} required minLength={10} maxLength={2000} aria-invalid={Boolean(errors.message)} aria-describedby={`message-hint${errors.message ? " message-error" : ""}`} className={`${inputClass} min-h-36 resize-y`} placeholder="Please delete my Game On account and related personal information. Add any details you want our team to know." />
          <div className="mt-2 flex items-start justify-between gap-3 text-xs text-go-off/70"><p id="message-hint">Please do not include passwords, OTPs, or payment card details.</p><span className="shrink-0 tabular-nums">{message.length}/2,000</span></div>
          {errors.message ? <p id="message-error" className="mt-2 text-sm text-red-300">{errors.message}</p> : null}
        </div>

        <div className="hidden" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>

        <div>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-white/10 p-4">
            <input name="consent" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "consent-error" : undefined} className={`mt-1 h-4 w-4 shrink-0 accent-go-brand ${focusClass}`} />
            <span className="text-sm leading-relaxed text-go-off/85">I am requesting deletion of my account and related personal information. I understand that Game On may verify account ownership before processing this request.</span>
          </label>
          {errors.consent ? <p id="consent-error" className="mt-2 text-sm text-red-300">{errors.consent}</p> : null}
        </div>
      </fieldset>

      {error ? <div role="alert" className="mt-5 flex gap-2.5 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200"><AlertCircle className="h-5 w-5 shrink-0" aria-hidden /><p>{error}</p></div> : null}
      <button type="submit" disabled={busy} className={`mt-6 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-go-brand px-5 py-3 text-sm font-bold text-go-black transition-colors hover:bg-go-brand/90 disabled:cursor-wait disabled:opacity-60 ${focusClass}`}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
        {busy ? "Sending your request…" : "Send deletion request"}
      </button>
      <p className="mt-4 text-center text-xs leading-relaxed text-go-off/70">Sent to <a href={`mailto:${ACCOUNT_DELETION_EMAIL}`} className={`break-all text-go-brand underline underline-offset-4 ${focusClass}`}>{ACCOUNT_DELETION_EMAIL}</a>, with a copy to you. Submitting does not immediately delete your account.</p>
    </form>
  );
}