'use client';

import {
  Building2,
  CalendarDays,
  CalendarX2,
  CirclePlus,
  ClipboardList,
  Dumbbell,
  History,
  Images,
  LayoutDashboard,
  Layers,
  LayoutGrid,
  LogOut,
  Megaphone,
  Menu,
  PartyPopper,
  Percent,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Trophy,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { signOut } from '@/lib/admin/actions/auth';
import type { StaffRole } from '@/lib/admin/session';
import { cn } from '@/lib/utils';

type NavItem = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean; badge?: number };
type NavGroup = { label: string; items: NavItem[] };

function navGroups(refundsPending: number): NavGroup[] {
  return [
    {
      label: 'Operations',
      items: [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/schedule', label: 'Schedule', icon: CalendarDays },
        { href: '/admin/check-in', label: 'Check-in', icon: ScanLine },
      ],
    },
    {
      label: 'Bookings',
      items: [
        { href: '/admin/bookings', label: 'All bookings', icon: ClipboardList },
        { href: '/admin/bookings/new', label: 'New booking', icon: CirclePlus },
        { href: '/admin/refunds', label: 'Refunds', icon: RotateCcw, adminOnly: true, badge: refundsPending },
        { href: '/admin/cancellation-policy', label: 'Cancellation policy', icon: Percent, adminOnly: true },
        { href: '/admin/customers', label: 'Customers', icon: Users },
      ],
    },
    {
      label: 'Venue setup',
      items: [
        { href: '/admin/venues', label: 'Venues & hours', icon: Building2, adminOnly: true },
        { href: '/admin/court-types', label: 'Court types & pricing', icon: Layers, adminOnly: true },
        { href: '/admin/courts', label: 'Courts', icon: LayoutGrid, adminOnly: true },
        { href: '/admin/sports', label: 'Sports', icon: Dumbbell, adminOnly: true },
        { href: '/admin/closures', label: 'Closures', icon: CalendarX2, adminOnly: true },
      ],
    },
    {
      label: 'Events & tournaments',
      items: [
        { href: '/admin/tournaments', label: 'Tournaments', icon: Trophy, adminOnly: true },
        { href: '/admin/events', label: 'Events', icon: PartyPopper, adminOnly: true },
      ],
    },
    {
      label: 'App content',
      items: [
        { href: '/admin/banners', label: 'Home banners', icon: Images, adminOnly: true },
        { href: '/admin/notifications', label: 'Notifications', icon: Megaphone, adminOnly: true },
      ],
    },
    {
      label: 'Administration',
      items: [
        { href: '/admin/team', label: 'Team & roles', icon: ShieldCheck, adminOnly: true },
        { href: '/admin/activity', label: 'Activity log', icon: History, adminOnly: true },
        { href: '/admin/account', label: 'My account', icon: UserCog },
      ],
    },
  ];
}

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  if (href === '/admin/bookings') {
    return pathname === '/admin/bookings' || (pathname.startsWith('/admin/bookings/') && pathname !== '/admin/bookings/new');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({
  user,
  refundsPending,
}: {
  user: { name: string; email: string; role: StaffRole };
  refundsPending: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const groups = navGroups(refundsPending)
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.adminOnly || user.role === 'ADMIN') }))
    .filter((group) => group.items.length > 0);

  const nav = (
    <nav aria-label="Admin" className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                      active ? 'bg-white/10 font-medium text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <Icon className={cn('size-4 shrink-0', active && 'text-go-brand')} aria-hidden />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full bg-go-brand px-1.5 text-xs font-semibold tabular-nums text-zinc-950">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 p-4">
      <p className="truncate text-sm font-medium text-white">{user.name}</p>
      <p className="truncate text-xs text-zinc-500">
        {user.email} · {user.role === 'ADMIN' ? 'Admin' : 'Staff'}
      </p>
      <form action={signOut} className="mt-3">
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut className="size-4" aria-hidden /> Sign out
        </button>
      </form>
    </div>
  );

  const brand = (
    <Link href="/admin" className="flex items-center gap-2 px-6 py-5" onClick={() => setOpen(false)}>
      <span className="text-lg font-bold tracking-wider text-white">
        GAME<span className="text-go-brand">ON</span>
      </span>
      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
        Admin
      </span>
    </Link>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-go-black px-4 py-3 lg:hidden">
        <Link href="/admin" className="text-base font-bold tracking-wider text-white">
          GAME<span className="text-go-brand">ON</span> <span className="text-xs font-medium text-zinc-400">Admin</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-zinc-300 hover:bg-white/10"
          aria-label="Open navigation"
          aria-expanded={open}
        >
          <Menu className="size-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-zinc-950/60" aria-label="Close navigation" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-go-black">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-zinc-300 hover:bg-white/10"
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-go-black lg:flex">
        {brand}
        {nav}
        {footer}
      </aside>
    </>
  );
}
