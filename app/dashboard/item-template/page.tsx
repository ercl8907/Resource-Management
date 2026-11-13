"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";

type ItemTemplate = {
  id: string;
  template_name: string;
  user_id: string;
  created_at: string;
};

type SortKey =
  | "template_name"
  | "created_at";
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

export default function ItemTemplatePage() {
  const [templates, setTemplates] = useState<ItemTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // The inline name editor is a transient interaction. With Cache
  // Components, navigating away hides this page with <Activity> instead of
  // unmounting it, so an open editor would still be shown when returning.
  // Reset it whenever the page becomes hidden.
  useLayoutEffect(() => {
    return () => {
      setEditingTemplateId(null);
      setEditingTemplateName("");
    };
  }, []);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/item-templates/list");
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          templates?: ItemTemplate[];
        };
        if (!res.ok) {
          setError(data.error ?? "Could not load templates. Please try again.");
          return;
        }
        setTemplates(data.templates ?? []);
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
      alert("Template name cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/item-templates/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ template_name: newName.trim() }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        template?: { template_name?: string };
      };

      if (!res.ok) {
        alert(data.error ?? "Failed to update template name");
        return;
      }

      const savedName = data.template?.template_name ?? newName.trim();

      // Update the local state
      setTemplates((prev) =>
        prev.map((template) =>
          template.id === id ? { ...template, template_name: savedName } : template
        )
      );
      setEditingTemplateId(null);
      setEditingTemplateName("");

      window.dispatchEvent(
        new CustomEvent("resource-management:template-renamed", {
          detail: { id, name: savedName },
        })
      );
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!templateName.trim()) {
      setError("Please enter a template name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/item-templates/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_name: templateName.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Could not create template. Please try again.");
        return;
      }

      setSuccess(true);
      setTemplateName("");
      // Refresh templates to include the new one
      const updatedTemplates = [...templates, { id: data.id, template_name: templateName.trim(), user_id: data.user_id, created_at: data.created_at }];
      setTemplates(updatedTemplates);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      let result: number;

      if (sortKey === "template_name") {
        result = a.template_name.localeCompare(b.template_name, undefined, {
          sensitivity: "base",
        });
      } else if (sortKey === "created_at") {
        result =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        result = 0;
      }

      return sortDirection === "asc" ? result : -result;
    });
  }, [templates, sortKey, sortDirection]);

  const headerButtonClass =
    "flex w-full cursor-pointer items-center gap-1.5 px-4 py-3 text-left text-sm font-semibold text-zinc-900 transition hover:text-zinc-950 dark:text-zinc-50 dark:hover:text-white";

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Item Templates
        </h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="max-w-md">
        <label htmlFor="templateName" className="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Template Name
        </label>
        <input
          id="templateName"
          name="templateName"
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
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
            Template created successfully.
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

      {isLoading ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>
      ) : error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No templates found. Start by creating a new template
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-900">
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th
                  scope="col"
                  aria-sort={
                    sortKey === "template_name"
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={() => handleSort("template_name")}
                    className={headerButtonClass}
                  >
                    Template Name
                    <SortIndicator
                      active={sortKey === "template_name"}
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
              {sortedTemplates.map((template) => (
                <tr
                  key={template.id}
                  className="border-b border-zinc-200 transition last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {editingTemplateId === template.id ? (
                        <>
                          <input
                            type="text"
                            value={editingTemplateName}
                            autoFocus
                            onChange={(e) => setEditingTemplateName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSave(template.id, editingTemplateName);
                              } else if (e.key === "Escape") {
                                setEditingTemplateId(null);
                                setEditingTemplateName("");
                              }
                            }}
                            className="rounded border border-zinc-300 bg-white px-3 py-1 text-sm font-medium outline-none ring-2 ring-zinc-400 focus:border-zinc-500 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-zinc-400 dark:focus:border-zinc-500 dark:focus:ring-zinc-400"
                          />
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSave(template.id, editingTemplateName);
                            }}
                            className="rounded bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                          >
                            Update
                          </button>
                        </>
                      ) : (
                        <>
                              <Link
                                href={`/dashboard/item-template/${encodeURIComponent(template.id)}`}
                                className="font-medium text-zinc-900 underline-offset-4 transition hover:underline dark:text-zinc-50"
                              >
                                {template.template_name}
                              </Link>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTemplateId(template.id);
                                  setEditingTemplateName(template.template_name);
                                }}
                                className="rounded bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                              >
                                Edit
                              </button>
                            </>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatDateTime(template.created_at)}
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
