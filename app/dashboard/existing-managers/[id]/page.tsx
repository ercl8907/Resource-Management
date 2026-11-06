"use client";

import { Suspense, use } from "react";

function ManagerDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Manager
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Manager ID: {id}
      </p>
    </div>
  );
}

export default function ManagerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>
      }
    >
      <ManagerDetails params={params} />
    </Suspense>
  );
}
