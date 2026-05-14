'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Tag,
  Building2,
  Briefcase,
  Users,
  ScrollText,
  LogOut,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/lib/auth-store';

const NAV = [
  { href: '/dashboard', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { href: '/domains', label: 'Domaines', icon: Tag },
  { href: '/companies', label: 'Entreprises', icon: Building2 },
  { href: '/jobs', label: 'Offres', icon: Briefcase },
  { href: '/users', label: 'Utilisateurs', icon: Users },
  { href: '/audit', label: 'Journal d’audit', icon: ScrollText },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s.hydrated);
  const hydrate = useAuth((s) => s.hydrate);
  const signOut = useAuth((s) => s.signOut);

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/login?denied=1');
  }, [hydrated, user, router]);

  if (!hydrated || !user || user.role !== 'admin') {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-bg">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  function handleSignOut() {
    signOut();
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen bg-surface-bg">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-line bg-white">
        <div className="px-6 pt-7 pb-5">
          <div className="inline-flex items-baseline tracking-tighter">
            <span className="text-2xl font-extrabold text-ink">work</span>
            <span className="ml-0.5 rounded-md bg-primary px-1.5 text-2xl font-extrabold text-white">
              a
            </span>
          </div>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-ink-secondary">
            Console admin
          </p>
        </div>

        <nav className="flex-1 px-3 pb-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold mb-1 transition-colors',
                  active
                    ? 'bg-surface-bgLight text-primary'
                    : 'text-ink-secondary hover:bg-surface-muted hover:text-ink',
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-bgLight text-sm font-bold text-primary">
              {user.phone.slice(-2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">Admin</p>
              <p className="truncate text-xs text-ink-secondary">{user.phone}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-line py-2 text-xs font-bold text-ink-secondary hover:border-danger hover:text-danger"
          >
            <LogOut size={14} />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t border-line bg-white">
        {NAV.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-bold',
                active ? 'text-primary' : 'text-ink-secondary',
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {item.label.split(' ')[0]}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
    </div>
  );
}
