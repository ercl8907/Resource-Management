"use client";

import type { FormEvent } from "react";

export type ItemField = {
  id: string;
  variable_name: string;
  variable_length: number;
};

export function ItemFieldsForm({ fields }: { fields: ItemField[] }) {
  // No storage target has been specified for the entered values yet, so keep
  // the form local instead of letting the browser reload the page.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md">
      <div className="flex flex-col gap-4">
        {fields.map((field) => (
          <div key={field.id}>
            <label
              htmlFor={`item-variable-${field.id}`}
              className="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-50"
            >
              {field.variable_name}
            </label>
            <input
              id={`item-variable-${field.id}`}
              name={field.variable_name}
              type="text"
              maxLength={field.variable_length}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        className="mt-4 w-full cursor-pointer rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        Submit
      </button>
    </form>
  );
}
