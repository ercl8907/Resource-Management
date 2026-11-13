"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";

export type ItemRow = {
  id: string;
  item_name: string;
  user_item_id: string | null;
};

export function ItemRows({ rows }: { rows: ItemRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The inline name editor is a transient interaction. With Cache
  // Components, navigating away hides this page with <Activity> instead of
  // unmounting it, so an open editor would still be shown when returning.
  // Reset it whenever the page becomes hidden.
  useLayoutEffect(() => {
    return () => {
      setEditingId(null);
      setEditingName("");
    };
  }, []);

  function startEditing(row: ItemRow) {
    setError(null);
    setEditingId(row.id);
    setEditingName(row.item_name);
  }

  function cancelEditing() {
    setError(null);
    setEditingId(null);
    setEditingName("");
  }

  async function save(id: string) {
    const nextName = editingName.trim();

    if (!nextName) {
      setError("Please enter an item name.");
      return;
    }

    setSavingId(id);
    setError(null);

    try {
      const res = await fetch(`/api/items/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_name: nextName }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        item?: { item_name?: string };
      };

      if (!res.ok) {
        setError(data.error ?? "Could not update item name. Please try again.");
        return;
      }

      setEditingId(null);
      setEditingName("");

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      {error && (
        <tr className="border-b border-zinc-200 dark:border-zinc-800">
          <td className="px-4 py-3">
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          </td>
        </tr>
      )}

      {rows.map((row) => {
        const isEditing = editingId === row.id;
        const isSaving = savingId === row.id;
        // Older rows may not have a user-facing id yet, so fall back to the
        // row's internal id instead of rendering a link to "null".
        const itemHrefId = row.user_item_id ?? row.id;

        return (
          <tr
            key={row.id}
            className="border-b border-zinc-200 transition last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editingName}
                      autoFocus
                      onChange={(event) => setEditingName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          save(row.id);
                        } else if (event.key === "Escape") {
                          cancelEditing();
                        }
                      }}
                      className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-3 py-1 text-sm font-medium outline-none ring-2 ring-zinc-400 focus:border-zinc-500 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-zinc-400 dark:focus:border-zinc-500 dark:focus:ring-zinc-400"
                    />
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => save(row.id)}
                      className="shrink-0 rounded bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                    >
                      {isSaving ? "Saving..." : "Update"}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href={`/dashboard/existing-managers/item/${encodeURIComponent(itemHrefId)}`}
                      className="font-medium text-zinc-900 underline-offset-4 transition hover:underline dark:text-zinc-50"
                    >
                      {row.item_name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => startEditing(row)}
                      className="shrink-0 rounded bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}
