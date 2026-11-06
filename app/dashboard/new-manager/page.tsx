"use client";

import { useState, type FormEvent } from "react";

export default function NewManagerPage() {
  const [managerName, setManagerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!managerName.trim()) {
      setError("Please enter a manager name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/managers/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manager_name: managerName.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Could not create manager. Please try again.");
        return;
      }

      setSuccess(true);
      setManagerName("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          New manager
        </h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="max-w-md">
        <label htmlFor="managerName" className="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Manager Name
        </label>
        <input
          id="managerName"
          name="managerName"
          type="text"
          value={managerName}
          onChange={(e) => setManagerName(e.target.value)}
          placeholder="e.g. Box of items"
          aria-invalid={Boolean(error)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
        />
        {error && (
          <p role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="mt-1.5 text-sm text-green-600 dark:text-green-400">
            Manager created successfully.
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-4 w-full cursor-pointer rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
