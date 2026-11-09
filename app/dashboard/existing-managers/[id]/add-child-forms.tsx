"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AddChildForms({ managerId }: { managerId: string }) {
  const router = useRouter();

  const [subcategoryName, setSubcategoryName] = useState("");
  const [subcategoryError, setSubcategoryError] = useState<string | null>(null);
  const [subcategorySuccess, setSubcategorySuccess] = useState(false);
  const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);

  const [itemName, setItemName] = useState("");
  const [itemError, setItemError] = useState<string | null>(null);
  const [itemSuccess, setItemSuccess] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);

  async function handleAddSubcategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubcategoryError(null);
    setSubcategorySuccess(false);

    if (!subcategoryName.trim()) {
      setSubcategoryError("Please enter a subcategory name.");
      return;
    }

    setIsAddingSubcategory(true);

    try {
      const res = await fetch(
        `/api/managers/${encodeURIComponent(managerId)}/subcategories`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ manager_name: subcategoryName.trim() }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setSubcategoryError(
          data.error ?? "Could not add subcategory. Please try again."
        );
        return;
      }

      setSubcategoryName("");
      setSubcategorySuccess(true);
      router.refresh();
    } catch {
      setSubcategoryError("Network error. Please try again.");
    } finally {
      setIsAddingSubcategory(false);
    }
  }

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setItemError(null);
    setItemSuccess(false);

    if (!itemName.trim()) {
      setItemError("Please enter an item name.");
      return;
    }

    setIsAddingItem(true);

    try {
      const res = await fetch(
        `/api/managers/${encodeURIComponent(managerId)}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item_name: itemName.trim() }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setItemError(data.error ?? "Could not add item. Please try again.");
        return;
      }

      setItemName("");
      setItemSuccess(true);
      router.refresh();
    } catch {
      setItemError("Network error. Please try again.");
    } finally {
      setIsAddingItem(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50";

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <form
        onSubmit={handleAddSubcategory}
        noValidate
        className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
          Add subcategory
        </h2>

        <div>
          <label
            htmlFor="subcategoryName"
            className="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-50"
          >
            Subcategory name
          </label>
          <input
            id="subcategoryName"
            name="subcategoryName"
            type="text"
            value={subcategoryName}
            onChange={(event) => setSubcategoryName(event.target.value)}
            placeholder="e.g. Tools"
            aria-invalid={Boolean(subcategoryError)}
            className={inputClass}
          />
        </div>

        {subcategoryError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {subcategoryError}
          </p>
        )}

        {subcategorySuccess && (
          <p role="status" className="text-sm text-green-600 dark:text-green-400">
            Subcategory added.
          </p>
        )}

        <button
          type="submit"
          disabled={isAddingSubcategory}
          className="mt-1 w-full cursor-pointer rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {isAddingSubcategory ? "Adding..." : "Add subcategory"}
        </button>
      </form>

      <form
        onSubmit={handleAddItem}
        noValidate
        className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
          Add item
        </h2>

        <div>
          <label
            htmlFor="itemName"
            className="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-50"
          >
            Item name
          </label>
          <input
            id="itemName"
            name="itemName"
            type="text"
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
            placeholder="e.g. Hammer"
            aria-invalid={Boolean(itemError)}
            className={inputClass}
          />
        </div>

        {itemError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {itemError}
          </p>
        )}

        {itemSuccess && (
          <p role="status" className="text-sm text-green-600 dark:text-green-400">
            Item added.
          </p>
        )}

        <button
          type="submit"
          disabled={isAddingItem}
          className="mt-1 w-full cursor-pointer rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {isAddingItem ? "Adding..." : "Add item"}
        </button>
      </form>
    </div>
  );
}
