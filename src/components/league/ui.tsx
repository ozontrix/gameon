"use client";

/**
 * Game On Multisports League — app-style UI primitives.
 *
 * Deliberately tighter and more "native" than the marketing site: dense cards,
 * mono micro-labels, pill CTAs and a sticky action bar so every screen reads
 * like a phone app on mobile and a clean dashboard on desktop.
 */

import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type IconType = ComponentType<{ className?: string }>;

/* ───────────────────────────── Panel ───────────────────────────── */

export function Panel({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass-subtle relative overflow-hidden rounded-[22px]",
        padded && "p-4 sm:p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ───────────────────────────── Labels ───────────────────────────── */

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-go-brand/80",
        className
      )}
    >
      {children}
    </p>
  );
}

export function Chip({
  children,
  tone = "neutral",
  className,
  icon: Icon,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "success" | "warn";
  className?: string;
  icon?: IconType;
}) {
  const tones = {
    neutral: "border-white/10 bg-white/[0.06] text-go-off/70",
    brand: "border-go-brand/30 bg-go-brand/15 text-go-brand",
    success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    warn: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        tones[tone],
        className
      )}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </span>
  );
}

export function SectionTitle({
  title,
  action,
  href,
  className,
}: {
  title: string;
  action?: string;
  href?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <h2 className="font-display text-lg uppercase tracking-wide text-go-white sm:text-xl">
        {title}
      </h2>
      {action && href ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-semibold text-go-brand transition-colors hover:text-go-brand/80"
        >
          {action}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

export function Progress({
  value,
  className,
  tone = "brand",
}: {
  value: number;
  className?: string;
  tone?: "brand" | "warn";
}) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/10", className)}>
      <div
        className={cn(
          "h-full rounded-full",
          tone === "brand"
            ? "bg-gradient-to-r from-go-brand/70 to-go-brand"
            : "bg-gradient-to-r from-amber-500/70 to-amber-400"
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* ───────────────────────────── Buttons ───────────────────────────── */

type ButtonVariant = "brand" | "ghost" | "outline" | "dark";

interface ButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  icon?: IconType;
  full?: boolean;
  type?: "button" | "submit";
}

const VARIANTS: Record<ButtonVariant, string> = {
  brand:
    "bg-go-brand text-go-black hover:bg-go-brand/90 shadow-[0_10px_30px_-12px_rgba(245,166,35,0.7)]",
  ghost:
    "bg-white/[0.05] text-go-off/80 hover:bg-white/[0.09] hover:text-go-white border border-white/10",
  outline: "border border-go-brand/40 text-go-brand hover:bg-go-brand/10",
  dark: "bg-go-navy text-go-off hover:bg-go-navy/80 border border-white/10",
};

const SIZES = {
  sm: "h-9 px-3.5 text-xs",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-[15px]",
} as const;

export function Button({
  children,
  href,
  onClick,
  variant = "brand",
  size = "md",
  className,
  disabled,
  icon: Icon,
  full,
  type = "button",
}: ButtonProps) {
  const classes = cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40",
    VARIANTS[variant],
    SIZES[size],
    full && "w-full",
    className
  );

  const content = (
    <>
      {Icon ? <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} /> : null}
      {children}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {content}
    </button>
  );
}

/* ───────────────────────────── Screen header ───────────────────────────── */

export function ScreenHeader({
  title,
  subtitle,
  backHref,
  right,
  className,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-4 flex items-start gap-3", className)}>
      {backHref ? (
        <Link
          href={backHref}
          aria-label="Go back"
          className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-go-off/80 transition-colors hover:bg-white/[0.1] hover:text-go-white active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl uppercase leading-tight tracking-wide text-go-white sm:text-3xl">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-go-off/55">{subtitle}</p> : null}
      </div>
      {right}
    </header>
  );
}

/* ───────────────────────────── Flow step bar ───────────────────────────── */

export const BOOKING_STEPS = [
  { id: "slot", label: "Slot", href: "/gameon-multisports-league/book/slot" },
  { id: "details", label: "Details", href: "/gameon-multisports-league/book/details" },
  { id: "review", label: "Review", href: "/gameon-multisports-league/book/review" },
  { id: "payment", label: "Payment", href: "/gameon-multisports-league/book/payment" },
] as const;

export type BookingStepId = (typeof BOOKING_STEPS)[number]["id"];

/** Compact 4-step progress rail used by every flow screen. */
export function StepBar({ current }: { current: BookingStepId }) {
  const activeIndex = BOOKING_STEPS.findIndex((step) => step.id === current);

  return (
    <div className="mb-5 flex items-center gap-1.5">
      {BOOKING_STEPS.map((step, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <div key={step.id} className="flex flex-1 flex-col gap-1.5">
            <div
              className={cn(
                "h-1 rounded-full transition-colors",
                done && "bg-go-brand/60",
                active && "bg-go-brand",
                !done && !active && "bg-white/10"
              )}
            />
            <span
              className={cn(
                "font-mono text-[9px] uppercase tracking-[0.18em]",
                active ? "text-go-brand" : done ? "text-go-off/45" : "text-go-off/25"
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────────── Small blocks ───────────────────────────── */

export function Stat({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[18px] border border-white/[0.07] bg-white/[0.03] px-3 py-3 text-center",
        className
      )}
    >
      <p className="font-display text-xl leading-none text-go-brand sm:text-2xl">{value}</p>
      <p className="mt-1.5 text-[10px] uppercase tracking-wider text-go-off/50">{label}</p>
    </div>
  );
}

export function IconTile({
  emoji,
  accent,
  size = "md",
  className,
}: {
  emoji: string;
  accent: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-10 w-10 text-lg rounded-[14px]",
    md: "h-14 w-14 text-2xl rounded-[20px]",
    lg: "h-16 w-16 text-3xl rounded-[22px]",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-white/10",
        sizes[size],
        className
      )}
      style={{ background: `linear-gradient(145deg, ${accent}33 0%, rgba(255,255,255,0.04) 100%)` }}
    >
      <span aria-hidden>{emoji}</span>
    </span>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
        checked ? "border-go-brand/50 bg-go-brand/80" : "border-white/10 bg-white/10"
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all",
          checked ? "left-[23px]" : "left-[3px]"
        )}
      />
    </button>
  );
}

export function InfoRow({
  label,
  value,
  strong,
  className,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-1.5", className)}>
      <span className="text-[13px] text-go-off/50">{label}</span>
      <span
        className={cn(
          "text-right text-[13px]",
          strong ? "font-semibold text-go-white" : "text-go-off/90"
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** Sticky action bar pinned above the safe area on mobile. */
export function StepFooter({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:static lg:mt-6 lg:pointer-events-auto">
      <div className="pointer-events-auto border-t border-white/10 bg-go-black/85 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:rounded-[22px] lg:border lg:bg-white/[0.04] lg:p-4 lg:pb-4">
        <div className="mx-auto w-full max-w-[560px] lg:max-w-none">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  emoji,
  title,
  copy,
  ctaLabel,
  ctaHref,
}: {
  emoji: string;
  title: string;
  copy: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <Panel className="flex flex-col items-center py-10 text-center">
      <span className="text-4xl" aria-hidden>
        {emoji}
      </span>
      <h2 className="mt-4 font-display text-xl uppercase tracking-wide text-go-white">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-go-off/55">{copy}</p>
      <Button href={ctaHref} className="mt-5">
        {ctaLabel}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </Panel>
  );
}
