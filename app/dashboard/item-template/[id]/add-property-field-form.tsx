"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { addPropertyField, type AddPropertyFieldState } from "./actions";

const initialState: AddPropertyFieldState = { status: "idle", message: "" };

export function AddPropertyFieldForm({ templateId }: { templateId: string }) {
  const [state, setState] = useState<AddPropertyFieldState>(initialState);
  const [pending, startTransition] = useTransition();
  const isActive = useRef(true);

  // Cache Components keeps this page mounted when navigating away, so clear the
  // transient success/error message when Activity hides it.
  useLayoutEffect(() => {
    isActive.current = true;
    return () => {
      isActive.current = false;
      setState(initialState);
    };
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await addPropertyField(initialState, formData);
      if (isActive.current) {
        setState(result);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md">
      <input type="hidden" name="templateId" value={templateId} />

      <label htmlFor="propertyName" className="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-50">
        Property Name
      </label>
      <input
        id="propertyName"
        name="propertyName"
        type="text"
        placeholder="e.g. Quantity"
        required
        className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50 mb-4"
      />

      <label htmlFor="propertyLength" className="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-50">
        Property Length
      </label>
      <input
        id="propertyLength"
        name="propertyLength"
        type="number"
        min="1"
        step="1"
        placeholder="e.g. 10"
        required
        className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
      />

      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`mt-3 text-sm ${
            state.status === "error"
              ? "text-red-600 dark:text-red-400"
              : "text-green-600 dark:text-green-400"
          }`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full cursor-pointer rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {pending ? "Adding..." : "Add Property Field"}
      </button>
    </form>
  );
}
