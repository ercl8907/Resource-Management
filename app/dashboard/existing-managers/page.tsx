"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Manager = {
  id: string;
  manager_name: string;
  user_id: string;
  created_at: string;
};

export default function ExistingManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-6">
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
          No managers yet.
        </p>
      ) : (
        <ul className="max-w-md space-y-2">
          {managers.map((manager) => (
            <li key={manager.id}>
              <Link
                href={`/dashboard/existing-managers/${manager.id}`}
                className="block cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
              >
                {manager.manager_name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
