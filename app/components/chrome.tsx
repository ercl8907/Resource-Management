"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, useState } from "react";

const HORIZONTAL_ITEMS = [{ href: "/dashboard", label: "Dashboard" }];

/**
 * False during prerendering/SSR, true after hydration. Next's Cache Components
 * don't allow `usePathname` while prerendering, so the navs below render a
 * pathname-less version first and the active-link version after mount.
 */
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function SidebarContent({ pathname }: { pathname: string | null }) {
  const isNewManager = pathname === "/dashboard/new-manager";
  const isExistingManagers = pathname === "/dashboard/existing-managers";

  return (
    <aside className="w-64 shrink-0 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <nav className="flex h-full flex-col p-4" aria-label="Dashboard">
        <p className="px-3 pb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          Resource Management
        </p>
        <ul className="space-y-1">
          <li>
            <Link
              href="/dashboard/new-manager"
              aria-current={isNewManager ? "page" : undefined}
              className={[
                "block cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition",
                isNewManager
                  ? "bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
              ].join(" ")}
            >
              New Manager
            </Link>
          </li>
          <li>
            <span
              className={[
                "block rounded-lg px-3 py-2 text-sm font-medium transition",
                isExistingManagers
                  ? "bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950"
                  : "text-zinc-700 dark:text-zinc-300",
              ].join(" ")}
            >
              Existing Managers
            </span>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

function SidebarWithPathname() {
  const pathname = usePathname();
  return <SidebarContent pathname={pathname} />;
}

export function Sidebar() {
  const mounted = useMounted();
  return mounted ? <SidebarWithPathname /> : <SidebarContent pathname={null} />;
}

function HorizontalNavContent({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Dashboard sections"
      className="shrink-0 border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <ul className="flex items-center gap-1 overflow-x-auto">
        {HORIZONTAL_ITEMS.map((item) => {
          const active =
            pathname !== null &&
            (pathname === item.href || pathname.startsWith(`${item.href}/`));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "block cursor-pointer px-3 py-3 text-sm font-medium transition hover:text-zinc-950 dark:hover:text-white",
                  active
                    ? "border-b-2 border-zinc-950 text-zinc-950 dark:border-zinc-50 dark:text-zinc-50"
                    : "border-b-2 border-transparent text-zinc-600 dark:text-zinc-400",
                ].join(" ")}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function HorizontalNavWithPathname() {
  const pathname = usePathname();
  return <HorizontalNavContent pathname={pathname} />;
}

export function HorizontalNav() {
  const mounted = useMounted();
  return mounted ? (
    <HorizontalNavWithPathname />
  ) : (
    <HorizontalNavContent pathname={null} />
  );
}

export function TopNav() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setIsSigningOut(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        setError(error.message ?? "Could not sign out. Please try again.");
        return;
      }
      // Hard-navigate so the App Router cache is discarded.
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        Resource Manager
      </p>
      <div className="flex items-center gap-4">
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="cursor-pointer rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
