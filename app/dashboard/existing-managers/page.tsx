"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { ManagerRenamedDetail } from "@/app/components/chrome";

type Manager = {
  id: string;
  manager_name: string;
  user_id: string;
  user_manager_id: string;
  created_at: string;
  subcategory_count: number;
  item_count: number;
};

type SortKey =
  | "manager_name"
  | "created_at"
  | "subcategory_count"
  | "item_count";
type SortDirection = "asc" | "desc";

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const pad = (part: number) => String(part).padStart(2, "0");

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join(" ");
}

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  return (
    <span
      aria-hidden="true"
      className={
        active
          ? "text-zinc-950 dark:text-zinc-50"
          : "text-zinc-400 dark:text-zinc-500"
      }
    >
      {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );
}

export default function ExistingManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [editingManagerId, setEditingManagerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // The inline name editor is a transient interaction. With Cache
  // Components, navigating away hides this page with <Activity> instead of
  // unmounting it, so an open editor would still be shown when returning.
  // Reset it whenever the page becomes hidden.
  useLayoutEffect(() => {
    return () => {
      setEditingManagerId(null);
      setEditingName("");
    };
  }, []);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/managers/list");
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          managers?: Manager[];
        };
        if (!res.ok) {
          setError(data.error ?? "Could not load managers. Please try again.");
          return;
        }
        setManagers(data.managers ?? []);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  async function handleSave(id: string, newName: string) {
    if (!newName.trim()) {
      alert("Manager name cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/managers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ manager_name: newName.trim() }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        manager?: { manager_name?: string };
      };

      if (!res.ok) {
        alert(data.error ?? "Failed to update manager name");
        return;
      }

      const savedName = data.manager?.manager_name ?? newName.trim();

      // Update the local state
      setManagers((prev) =>
        prev.map((manager) =>
          manager.id === id ? { ...manager, manager_name: savedName } : manager
        )
      );
      setEditingManagerId(null);
      setEditingName("");

      window.dispatchEvent(
        new CustomEvent<ManagerRenamedDetail>("resource-management:manager-renamed", {
          detail: { id, name: savedName },
        })
      );
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const sortedManagers = useMemo(() => {
    return [...managers].sort((a, b) => {
      let result: number;

      if (sortKey === "manager_name") {
        result = a.manager_name.localeCompare(b.manager_name, undefined, {
          sensitivity: "base",
        });
      } else if (sortKey === "created_at") {
        result =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortKey === "subcategory_count") {
        result = a.subcategory_count - b.subcategory_count;
      } else {
        result = a.item_count - b.item_count;
      }

      return sortDirection === "asc" ? result : -result;
    });
  }, [managers, sortKey, sortDirection]);

  const headerButtonClass =
    "flex w-full cursor-pointer items-center gap-1.5 px-4 py-3 text-left text-sm font-semibold text-zinc-900 transition hover:text-zinc-950 dark:text-zinc-50 dark:hover:text-white";

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Existing managers
        </h1>
      </div>

      {isLoading ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>
      ) : error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : managers.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No managers found. Start by creating a new manager
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-900">
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th
                  scope="col"
                  aria-sort={
                    sortKey === "manager_name"
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={() => handleSort("manager_name")}
                    className={headerButtonClass}
                  >
                    Manager Name
                    <SortIndicator
                      active={sortKey === "manager_name"}
                      direction={sortDirection}
                    />
                  </button>
                </th>
                <th
                  scope="col"
                  aria-sort={
                    sortKey === "subcategory_count"
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className="w-40"
                >
                  <button
                    type="button"
                    onClick={() => handleSort("subcategory_count")}
                    className={headerButtonClass}
                  >
                    Subcategories
                    <SortIndicator
                      active={sortKey === "subcategory_count"}
                      direction={sortDirection}
                    />
                  </button>
                </th>
                <th
                  scope="col"
                  aria-sort={
                    sortKey === "item_count"
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className="w-36"
                >
                  <button
                    type="button"
                    onClick={() => handleSort("item_count")}
                    className={headerButtonClass}
                  >
                    Total Items
                    <SortIndicator
                      active={sortKey === "item_count"}
                      direction={sortDirection}
                    />
                  </button>
                </th>
                <th
                  scope="col"
                  aria-sort={
                    sortKey === "created_at"
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className="w-56"
                >
                  <button
                    type="button"
                    onClick={() => handleSort("created_at")}
                    className={headerButtonClass}
                  >
                    Created At
                    <SortIndicator
                      active={sortKey === "created_at"}
                      direction={sortDirection}
                    />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedManagers.map((manager) => (
                <tr
                  key={manager.id}
                  className="border-b border-zinc-200 transition last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {editingManagerId === manager.id ? (
                        <>
                          <input
                            type="text"
                            value={editingName}
                            autoFocus
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSave(manager.id, editingName);
                              } else if (e.key === "Escape") {
                                setEditingManagerId(null);
                                setEditingName("");
                              }
                            }}
                            className="rounded border border-zinc-300 bg-white px-3 py-1 text-sm font-medium outline-none ring-2 ring-zinc-400 focus:border-zinc-500 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-zinc-400 dark:focus:border-zinc-500 dark:focus:ring-zinc-400"
                          />
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSave(manager.id, editingName);
                            }}
                            className="rounded bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                          >
                            Update
                          </button>
                        </>
                      ) : (
                        <>
                          <Link
                            href={`/dashboard/existing-managers/${encodeURIComponent(manager.user_manager_id)}`}
                            className="font-medium text-zinc-900 underline-offset-4 transition hover:underline dark:text-zinc-50"
                          >
                            {manager.manager_name}
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingManagerId(manager.id);
                              setEditingName(manager.manager_name);
                            }}
                            className="rounded bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                          >
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {manager.subcategory_count}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {manager.item_count}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatDateTime(manager.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
