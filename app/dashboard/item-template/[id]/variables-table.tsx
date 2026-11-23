"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import {
  renameTemplateVariable,
  swapTemplateVariableOrder,
  updateTemplateVariableLength,
} from "./actions";

export type TemplateVariable = {
  id: string;
  variable_name: string;
  variable_length: number;
  item_order: number;
  created_at: string;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const pad = (part: number) => String(part).padStart(2, "0");

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join(" ");
}

export function VariablesTable({ variables }: { variables: TemplateVariable[] }) {
  const [editingVariableId, setEditingVariableId] = useState<string | null>(null);
  const [editingVariableName, setEditingVariableName] = useState("");
  const [editingLengthVariableId, setEditingLengthVariableId] = useState<string | null>(null);
  const [editingLength, setEditingLength] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, startTransition] = useTransition();
  const [isReordering, startReorderTransition] = useTransition();
  const isActive = useRef(true);

  // Cache Components keeps this page mounted when navigating away, so clear the
  // transient editing state when Activity hides it.
  useLayoutEffect(() => {
    isActive.current = true;
    return () => {
      isActive.current = false;
      setEditingVariableId(null);
      setEditingVariableName("");
      setEditingLengthVariableId(null);
      setEditingLength("");
      setErrorMessage("");
    };
  }, []);

  function cancelNameEditing() {
    setEditingVariableId(null);
    setEditingVariableName("");
    setErrorMessage("");
  }

  function cancelLengthEditing() {
    setEditingLengthVariableId(null);
    setEditingLength("");
    setErrorMessage("");
  }

  function handleSaveName(variableId: string, variableName: string) {
    startTransition(async () => {
      const result = await renameTemplateVariable(variableId, variableName);
      if (!isActive.current) return;

      if (result.status === "success") {
        cancelNameEditing();
      } else {
        setErrorMessage(result.message);
      }
    });
  }

  function handleSaveLength(variableId: string, variableLength: string) {
    const trimmedLength = variableLength.trim();

    const lengthValue = Number(trimmedLength);
    if (!/^\d+$/.test(trimmedLength) || !Number.isSafeInteger(lengthValue) || lengthValue <= 1) {
      setErrorMessage("Length must be a positive whole number greater than 1.");
      return;
    }

    startTransition(async () => {
      const result = await updateTemplateVariableLength(variableId, trimmedLength);
      if (!isActive.current) return;

      if (result.status === "success") {
        cancelLengthEditing();
      } else {
        setErrorMessage(result.message);
      }
    });
  }

  function handleSwapOrder(variableId: string, otherVariableId: string) {
    setErrorMessage("");
    startReorderTransition(async () => {
      const result = await swapTemplateVariableOrder(variableId, otherVariableId);
      if (!isActive.current) return;

      if (result.status === "success") {
        cancelNameEditing();
        cancelLengthEditing();
      } else {
        setErrorMessage(result.message);
      }
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-900">
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th scope="col" className="w-1/4">
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-1.5 px-4 py-3 text-left text-sm font-semibold text-zinc-900 transition hover:text-zinc-950 dark:text-zinc-50 dark:hover:text-white"
                >
                  Variable Name
                </button>
              </th>
              <th scope="col" className="w-1/4">
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-1.5 px-4 py-3 text-left text-sm font-semibold text-zinc-900 transition hover:text-zinc-950 dark:text-zinc-50 dark:hover:text-white"
                >
                  Length
                </button>
              </th>
              <th scope="col" className="w-1/4">
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-1.5 px-4 py-3 text-left text-sm font-semibold text-zinc-900 transition hover:text-zinc-950 dark:text-zinc-50 dark:hover:text-white"
                >
                  Order
                </button>
              </th>
              <th scope="col" className="w-1/4">
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-1.5 px-4 py-3 text-left text-sm font-semibold text-zinc-900 transition hover:text-zinc-950 dark:text-zinc-50 dark:hover:text-white"
                >
                  Created At
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {variables.map((variable, index) => (
              <tr
                key={variable.id}
                className="border-b border-zinc-200 transition last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {editingVariableId === variable.id ? (
                      <>
                        <input
                          type="text"
                          value={editingVariableName}
                          autoFocus
                          onChange={(e) => setEditingVariableName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveName(variable.id, editingVariableName);
                            } else if (e.key === "Escape") {
                              cancelNameEditing();
                            }
                          }}
                          className="rounded border border-zinc-300 bg-white px-3 py-1 text-sm font-medium outline-none ring-2 ring-zinc-400 focus:border-zinc-500 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-zinc-400 dark:focus:border-zinc-500 dark:focus:ring-zinc-400"
                        />
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveName(variable.id, editingVariableName);
                          }}
                          className="rounded bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                        >
                          {isSaving ? "Saving..." : "Update"}
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">
                          {variable.variable_name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLengthVariableId(null);
                            setEditingLength("");
                            setEditingVariableId(variable.id);
                            setEditingVariableName(variable.variable_name);
                            setErrorMessage("");
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
                  <div className="flex items-center gap-2">
                    {editingLengthVariableId === variable.id ? (
                      <>
                        <input
                          type="number"
                          min={2}
                          step={1}
                          value={editingLength}
                          autoFocus
                          onChange={(e) => setEditingLength(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveLength(variable.id, editingLength);
                            } else if (e.key === "Escape") {
                              cancelLengthEditing();
                            }
                          }}
                          className="w-20 rounded border border-zinc-300 bg-white px-3 py-1 text-sm font-medium outline-none ring-2 ring-zinc-400 focus:border-zinc-500 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-zinc-400 dark:focus:border-zinc-500 dark:focus:ring-zinc-400"
                        />
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveLength(variable.id, editingLength);
                          }}
                          className="rounded bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                        >
                          {isSaving ? "Saving..." : "Update"}
                        </button>
                      </>
                    ) : (
                      <>
                        <span>{variable.variable_length}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingVariableId(null);
                            setEditingVariableName("");
                            setEditingLengthVariableId(variable.id);
                            setEditingLength(String(variable.variable_length));
                            setErrorMessage("");
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
                  <div className="flex items-center gap-2">
                    <span>{variable.item_order}</span>
                    <div className="flex flex-col">
                      <button
                        type="button"
                        aria-label={`Move ${variable.variable_name} up`}
                        disabled={index === 0 || isReordering}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSwapOrder(variable.id, variables[index - 1].id);
                        }}
                        className="rounded px-1 text-xs leading-none text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:disabled:hover:bg-transparent"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${variable.variable_name} down`}
                        disabled={index === variables.length - 1 || isReordering}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSwapOrder(variable.id, variables[index + 1].id);
                        }}
                        className="rounded px-1 text-xs leading-none text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:disabled:hover:bg-transparent"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {formatDateTime(variable.created_at)}
                </td>
              </tr>
            ))}
            {variables.length === 0 && (
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <td colSpan={4} className="px-4 py-3">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    No variables found
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {errorMessage && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
