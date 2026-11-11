"use client";

import { useRouter } from "next/navigation";
import { useState, useLayoutEffect, type FormEvent, type KeyboardEvent } from "react";
import type { ManagerRenamedDetail } from "@/app/components/chrome";

export function EditManagerName({
  managerId,
  managerName,
}: {
  managerId: string;
  managerName: string;
}) {
  const router = useRouter();

  const [name, setName] = useState(managerName);
  const [draft, setDraft] = useState(managerName);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editing the name is a transient interaction. With Cache Components,
  // navigating away hides this page with <Activity> instead of unmounting
  // it, so the editor would still be open when returning. Reset it
  // whenever the page becomes hidden.
  useLayoutEffect(() => {
    return () => {
      setIsEditing(false);
    };
  }, []);

  function startEditing() {
    setDraft(name);
    setError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraft(name);
    setError(null);
    setIsEditing(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextName = draft.trim();

    if (!nextName) {
      setError("Please enter a manager name.");
      return;
    }

    if (nextName === name) {
      setIsEditing(false);
      setError(null);
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const res = await fetch(
        `/api/managers/${encodeURIComponent(managerId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ manager_name: nextName }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        manager?: { manager_name?: string };
      };

      if (!res.ok) {
        setError(
          data.error ?? "Could not update manager name. Please try again."
        );
        return;
      }

      const savedName = data.manager?.manager_name ?? nextName;

      setName(savedName);
      setDraft(savedName);
      setIsEditing(false);

      router.refresh();
      // Tell the navs (possibly in another module instance) about the rename.
      window.dispatchEvent(
        new CustomEvent<ManagerRenamedDetail>("resource-management:manager-renamed", {
          detail: { id: managerId, name: savedName },
        })
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      cancelEditing();
    }
  }

  if (isEditing) {
    return (
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full max-w-xl flex-col gap-2"
      >
        <div className="flex items-stretch">
          <label htmlFor="managerName" className="sr-only">
            Manager name
          </label>
          <input
            id="managerName"
            name="managerName"
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-invalid={Boolean(error)}
            autoFocus
            className="min-w-0 flex-1 rounded-l-lg border border-r-0 border-zinc-300 bg-white px-3.5 py-2 text-2xl font-semibold tracking-tight text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
          />
          <button
            type="submit"
            disabled={isSaving}
            className="shrink-0 cursor-pointer rounded-r-lg border border-zinc-950 bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Edit Name
          </button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {name}
      </h1>
      <button
        type="button"
        onClick={startEditing}
        aria-label="Edit manager name"
        title="Edit manager name"
        className="cursor-pointer rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
    </div>
  );
}
