"use client";

import { createClient } from "@/lib/supabase/client";
import { clearLastActivity } from "@/lib/inactivity";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, useEffect, useState } from "react";

const HORIZONTAL_ITEMS = [{ href: "/dashboard", label: "Dashboard" }];

const MANAGER_DETAIL_PATH = /^\/dashboard\/existing-managers\/([^/]+)\/?$/;

function getManagerId(pathname: string | null): string | null {
  if (!pathname) return null;

  const match = MANAGER_DETAIL_PATH.exec(pathname);
  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

type ManagerHistoryItem = {
  id: string;
  name: string;
};

const MANAGER_HISTORY_KEY = "resource-management:manager-history";

// Broadcast renames through the window so the breadcrumb updates even if the
// code that performs the rename and the nav live in separate module instances.
const MANAGER_RENAMED_EVENT = "resource-management:manager-renamed";

type ManagerRenamedDetail = { id: string; name: string };

function readManagerHistory(): ManagerHistoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(MANAGER_HISTORY_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is ManagerHistoryItem => {
      if (typeof item !== "object" || item === null) return false;

      const candidate = item as Partial<ManagerHistoryItem>;
      return (
        typeof candidate.id === "string" && typeof candidate.name === "string"
      );
    });
  } catch {
    return [];
  }
}

function writeManagerHistory(history: ManagerHistoryItem[]) {
  if (typeof window === "undefined") return;

  try {
    if (history.length === 0) {
      window.sessionStorage.removeItem(MANAGER_HISTORY_KEY);
    } else {
      window.sessionStorage.setItem(
        MANAGER_HISTORY_KEY,
        JSON.stringify(history)
      );
    }
  } catch {
    // The breadcrumb is a convenience; ignore storage failures.
  }
}

const EMPTY_MANAGER_HISTORY: ManagerHistoryItem[] = [];
let managerHistory: ManagerHistoryItem[] = readManagerHistory();
// Names learned from rename events before the manager is added to the trail.
const pendingManagerNames = new Map<string, string>();
const managerHistoryListeners = new Set<() => void>();

function getManagerHistorySnapshot() {
  return managerHistory;
}

function getManagerHistoryServerSnapshot() {
  return EMPTY_MANAGER_HISTORY;
}

function subscribeToManagerHistory(listener: () => void) {
  managerHistoryListeners.add(listener);
  return () => {
    managerHistoryListeners.delete(listener);
  };
}

function updateManagerHistory(next: ManagerHistoryItem[]) {
  if (next === managerHistory) return;

  managerHistory = next;
  writeManagerHistory(next);
  managerHistoryListeners.forEach((listener) => listener());
}

function resetManagerHistory() {
  pendingManagerNames.clear();
  updateManagerHistory(EMPTY_MANAGER_HISTORY);
}

function addManagerToHistory(id: string, name: string) {
  if (managerHistory.some((item) => item.id === id)) return;

  updateManagerHistory([
    ...managerHistory,
    { id, name: pendingManagerNames.get(id) ?? name },
  ]);
}

/** Keep the breadcrumb label in sync when a manager is renamed. */
export function renameManagerInHistory(id: string, name: string) {
  applyManagerRename(id, name);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<ManagerRenamedDetail>(MANAGER_RENAMED_EVENT, {
        detail: { id, name },
      })
    );
  }
}

function applyManagerRename(id: string, name: string) {
  const index = managerHistory.findIndex((item) => item.id === id);
  if (index === -1 || managerHistory[index].name === name) return;

  const next = [...managerHistory];
  next[index] = { id, name };
  updateManagerHistory(next);
}

function truncateManagerHistory(id: string) {
  const index = managerHistory.findIndex((item) => item.id === id);
  if (index === -1 || index === managerHistory.length - 1) return;

  updateManagerHistory(managerHistory.slice(0, index + 1));
}

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
  const isExistingManagers =
    pathname === "/dashboard/existing-managers" ||
    pathname?.startsWith("/dashboard/existing-managers/");

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
            <Link
              href="/dashboard/existing-managers"
              aria-current={isExistingManagers ? "page" : undefined}
              className={[
                "block cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition",
                isExistingManagers
                  ? "bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
              ].join(" ")}
            >
              Existing Managers
            </Link>
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
  const currentManagerId = getManagerId(pathname);
  const managerHistory = useSyncExternalStore(
    subscribeToManagerHistory,
    getManagerHistorySnapshot,
    getManagerHistoryServerSnapshot
  );

  // Apply renames announced by the edit form, which may be running in a
  // different module instance than this nav.
  useEffect(() => {
    function handleManagerRenamed(event: Event) {
      const detail = (event as CustomEvent<ManagerRenamedDetail>).detail;

      if (
        !detail ||
        typeof detail.id !== "string" ||
        typeof detail.name !== "string"
      ) {
        return;
      }

      applyManagerRename(detail.id, detail.name);
      pendingManagerNames.set(detail.id, detail.name);
    }

    window.addEventListener(MANAGER_RENAMED_EVENT, handleManagerRenamed);
    return () =>
      window.removeEventListener(MANAGER_RENAMED_EVENT, handleManagerRenamed);
  }, []);

  // The breadcrumb history belongs to the Existing Managers section. Returning
  // to the dashboard or opening another section starts a fresh trail.
  useEffect(() => {
    if (pathname === null) return;

    const inExistingManagers =
      pathname === "/dashboard/existing-managers" ||
      pathname.startsWith("/dashboard/existing-managers/");

    if (!inExistingManagers) {
      resetManagerHistory();
    }
  }, [pathname]);

  // Append the manager being viewed to the trail. Revisiting an earlier
  // manager truncates the forward history, like a breadcrumb trail.
  useEffect(() => {
    if (!currentManagerId) return;

    const managerId = currentManagerId;

    if (managerHistory.some((item) => item.id === managerId)) {
      truncateManagerHistory(managerId);
      return;
    }

    let active = true;

    async function loadManager() {
      try {
        const res = await fetch(`/api/managers/${encodeURIComponent(managerId)}`);
        if (!res.ok) return;

        const data = (await res.json()) as {
          manager?: { manager_name?: string };
        };

        const name = data.manager?.manager_name;
        if (!active || !name) return;

        addManagerToHistory(managerId, name);
      } catch {
        // If the name can't be loaded, the breadcrumb item is skipped.
      }
    }

    loadManager();

    return () => {
      active = false;
    };
  }, [currentManagerId, managerHistory]);

  return (
    <nav
      aria-label="Dashboard sections"
      className="shrink-0 border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <ul className="flex items-center gap-1 overflow-x-auto">
        {HORIZONTAL_ITEMS.map((item) => {
          const active =
            !currentManagerId &&
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
        {currentManagerId !== null &&
          managerHistory.map((item) => {
            const isCurrent = item.id === currentManagerId;
            return (
              <li key={item.id} className="flex items-center">
                <span
                  aria-hidden="true"
                  className="px-1 text-sm text-zinc-400 dark:text-zinc-500"
                >
                  /
                </span>
                <Link
                  href={`/dashboard/existing-managers/${encodeURIComponent(item.id)}`}
                  aria-current={isCurrent ? "page" : undefined}
                  className={[
                    "block cursor-pointer whitespace-nowrap px-3 py-3 text-sm font-medium transition",
                    isCurrent
                      ? "border-b-2 border-zinc-950 text-zinc-950 dark:border-zinc-50 dark:text-zinc-50"
                      : "border-b-2 border-transparent text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white",
                  ].join(" ")}
                >
                  {item.name}
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
      clearLastActivity();
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
