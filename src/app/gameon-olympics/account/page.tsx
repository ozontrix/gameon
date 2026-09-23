"use client";

/**
 * Game On Olympics — account.
 *
 * Player profile, season stats, notification preferences and the usual
 * support links. Everything is local state; actions raise a toast.
 */

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bell,
  ChevronRight,
  CreditCard,
  Headphones,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button, Chip, Kicker, Panel, ScreenHeader, Toggle } from "@/components/olympics/ui";

const PREFERENCES = [
  { id: "whatsapp", label: "WhatsApp updates", copy: "Fixtures, scores and check-in codes" },
  { id: "reminders", label: "Slot reminders", copy: "A nudge 90 minutes before your match" },
  { id: "offers", label: "Offers & drops", copy: "Early-bird codes and new brackets" },
];

const LINKS = [
  { label: "Saved squad", copy: "Reuse your cricket & football line-ups", icon: Users },
  { label: "Payment methods", copy: "2 saved UPI apps", icon: CreditCard },
  { label: "Help & support", copy: "Call the front desk or chat with us", icon: Headphones },
  {
    label: "Terms & privacy",
    copy: "Event rules and refund policy",
    icon: ShieldCheck,
    href: "/terms",
  },
];

export default function OlympicsAccountPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    whatsapp: true,
    reminders: true,
    offers: false,
  });

  return (
    <div>
      <ScreenHeader title="Account" subtitle="Your Game On Olympics profile" />

      {/* ─── Profile ─── */}
      <Panel className="mb-4">
        <div className="flex items-center gap-3.5">
          <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-go-brand/35 bg-go-brand/15 font-display text-2xl text-go-brand">
            CS
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl uppercase leading-tight text-go-white">
              Chander Sharma
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-go-off/50">
              <Mail className="h-3.5 w-3.5" />
              chander@email.com
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-go-off/50">
              <MapPin className="h-3.5 w-3.5" />
              Sector 43, Gurugram
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={Pencil}
            onClick={() => toast.message("Profile editing opens with the live app.")}
          >
            Edit
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-4">
          {[
            { value: "6", label: "Entries" },
            { value: "4", label: "Sports" },
            { value: "3", label: "Podiums" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-2xl leading-none text-go-brand">{stat.value}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-go-off/45">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Chip tone="brand">Season 1 player</Chip>
          <Chip>Member since 2024</Chip>
        </div>
      </Panel>

      {/* ─── Preferences ─── */}
      <Panel className="mb-4">
        <div className="mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4 text-go-brand" />
          <Kicker>Notifications</Kicker>
        </div>
        <div className="space-y-3">
          {PREFERENCES.map((preference) => (
            <div key={preference.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-go-white">{preference.label}</p>
                <p className="text-[11.5px] text-go-off/45">{preference.copy}</p>
              </div>
              <Toggle
                label={preference.label}
                checked={Boolean(prefs[preference.id])}
                onChange={(next) => setPrefs((current) => ({ ...current, [preference.id]: next }))}
              />
            </div>
          ))}
        </div>
      </Panel>

      {/* ─── Links ─── */}
      <Panel className="mb-4" padded={false}>
        {LINKS.map((link) => {
          const Icon = link.icon;
          const inner = (
            <>
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.04] text-go-brand">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium text-go-white">{link.label}</span>
                <span className="block text-[11.5px] text-go-off/45">{link.copy}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-go-off/35" />
            </>
          );

          return link.href ? (
            <Link
              key={link.label}
              href={link.href}
              className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3.5 transition-colors last:border-b-0 hover:bg-white/[0.03]"
            >
              {inner}
            </Link>
          ) : (
            <button
              key={link.label}
              type="button"
              onClick={() => toast.message(`${link.label} arrives with the live app.`)}
              className="flex w-full items-center gap-3 border-b border-white/[0.06] px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-white/[0.03]"
            >
              {inner}
            </button>
          );
        })}
      </Panel>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button
          variant="ghost"
          size="lg"
          icon={LogOut}
          className="flex-1"
          onClick={() => toast.message("You are signed in as a guest for this preview.")}
        >
          Log out
        </Button>
        <Button href="/gameon-olympics/sports" size="lg" className="flex-1">
          Book another slot
        </Button>
      </div>

      <p className="mt-4 text-center text-[11px] text-go-off/30">
        Game On Olympics · Season 1 · v1.0 preview
      </p>
    </div>
  );
}
