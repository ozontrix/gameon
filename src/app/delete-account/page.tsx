import type { Metadata } from "next";
import Link from "next/link";
import { Mail, ShieldCheck, UserRoundMinus } from "lucide-react";
import { LegalPageShell } from "@/components/LegalPageShell";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { ACCOUNT_DELETION_EMAIL } from "@/lib/account-deletion";

export const metadata: Metadata = {
  title: "Delete Account | Game On Multisports",
  description: "Request deletion of your Game On account and related personal information using your registered phone number or email address. Receive an email copy of your request.",
};

export default function DeleteAccountPage() {
  return (
    <LegalPageShell title="Your account. Your choice." eyebrow="Account & data support">
      <div className="-mt-3 space-y-6">
        <p className="max-w-2xl text-base leading-relaxed text-go-off/80">Want to leave Game On? Use this form to request deletion of your account and related personal information. Enter the phone number or email linked to your account and tell us what you would like removed.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: UserRoundMinus, title: "1. Submit your request", copy: "Share your account contact and deletion message." },
            { icon: Mail, title: "2. Keep your email copy", copy: "Receive your details and a request reference by email." },
            { icon: ShieldCheck, title: "3. Our team reviews it", copy: "We may verify ownership before processing deletion." },
          ].map(({ icon: Icon, title, copy }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <Icon className="h-5 w-5 text-go-brand" aria-hidden /><h2 className="mt-3 text-sm font-semibold text-go-white">{title}</h2><p className="mt-2 text-sm leading-relaxed text-go-off/75">{copy}</p>
            </div>
          ))}
        </div>
        <DeleteAccountForm />
        <section className="rounded-2xl border border-white/10 p-5 text-sm leading-relaxed text-go-off/75" aria-labelledby="deletion-next">
          <h2 id="deletion-next" className="font-semibold text-go-white">What happens after you submit?</h2>
          <p className="mt-2">This form sends a request to our support team; it does not automatically delete your account. We may ask you to verify account ownership and clarify the information you want deleted. Some records may need to be retained as described in our <Link href="/privacy" className="text-go-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-go-brand">Privacy Policy</Link>.</p>
          <p className="mt-3">Need help or want to correct a request? Email <a href={`mailto:${ACCOUNT_DELETION_EMAIL}`} className="break-all text-go-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-go-brand">{ACCOUNT_DELETION_EMAIL}</a> and include your request reference.</p>
        </section>
      </div>
    </LegalPageShell>
  );
}