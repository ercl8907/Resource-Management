import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AddChildForms } from "./add-child-forms";
import { EditManagerName } from "./edit-manager-name";

// The manager lookup must run before anything is sent to the browser, so this
// route blocks instead of being prerendered with a static shell.
export const instant = false;

type Subcategory = {
  id: string;
  manager_name: string;
};

type Item = {
  id: string;
  item_name: string;
};

export default async function ManagerDetailPage({
  params,
}: PageProps<"/dashboard/existing-managers/[id]">) {
  // Render at request time: auth.getUser() reads the current time while
  // validating the session, which isn't allowed during prerendering.
  await connection();

  const { id } = await params;

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        Could not load manager. Please try again.
      </p>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: manager, error: managerError } = await supabase
    .from("managers")
    .select("id, manager_name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (managerError) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {managerError.message ?? "Could not load manager. Please try again."}
      </p>
    );
  }

  // Missing, or the manager belongs to a different user.
  if (!manager) {
    redirect("/dashboard");
  }

  const [subcategoriesResult, itemsResult] = await Promise.all([
    supabase
      .from("managers")
      .select("id, manager_name")
      .eq("parent_id", manager.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("manager_item")
      .select("id, item_name")
      .eq("manager_id", manager.id)
      .order("created_at", { ascending: true }),
  ]);

  const subcategories: Subcategory[] = subcategoriesResult.error
    ? []
    : (subcategoriesResult.data ?? []);
  const subcategoriesError = subcategoriesResult.error
    ? (subcategoriesResult.error.message ??
      "Could not load subcategories. Please try again.")
    : null;

  const items: Item[] = itemsResult.error
    ? []
    : (itemsResult.data ?? []);
  const itemsError = itemsResult.error
    ? (itemsResult.error.message ?? "Could not load items. Please try again.")
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <EditManagerName
        managerId={manager.id}
        managerName={manager.manager_name}
      />

      <AddChildForms managerId={manager.id} />

      <div className="grid min-h-0 flex-1 grid-rows-2 gap-6 sm:grid-cols-2 sm:grid-rows-1">
        <section className="flex min-h-0 w-full flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            Subcategories
          </h2>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {subcategoriesError ? (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {subcategoriesError}
              </p>
            ) : subcategories.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No subcategories found.
              </p>
            ) : (
              <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-900 marker:text-zinc-400 dark:text-zinc-50 dark:marker:text-zinc-500">
                {subcategories.map((subcategory) => (
                  <li key={subcategory.id}>
                    <Link
                      href={`/dashboard/existing-managers/${encodeURIComponent(subcategory.id)}`}
                      className="cursor-pointer font-medium underline-offset-4 hover:underline"
                    >
                      {subcategory.manager_name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="flex min-h-0 w-full flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            Items
          </h2>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {itemsError ? (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {itemsError}
              </p>
            ) : items.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No items found.
              </p>
            ) : (
              <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-900 marker:text-zinc-400 dark:text-zinc-50 dark:marker:text-zinc-500">
                {items.map((item) => (
                  <li key={item.id}>{item.item_name}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
