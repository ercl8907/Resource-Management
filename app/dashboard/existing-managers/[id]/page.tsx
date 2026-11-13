import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AddChildForms } from "./add-child-forms";
import { ItemRows } from "./item-rows";
import { SubcategoryRows } from "./subcategory-rows";

// The manager lookup must run before anything is sent to the browser, so this
// route blocks instead of being prerendered with a static shell.
export const instant = false;

type Subcategory = {
  id: string;
  manager_name: string;
  user_manager_id: string;
  created_at: string;
};

type Item = {
  id: string;
  item_name: string;
  user_item_id: string | null;
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
    .eq("user_manager_id", id)
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
      .select("id, manager_name, user_manager_id, created_at")
      .eq("parent_id", manager.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("manager_item")
      .select("id, item_name, user_item_id")
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

  const items: Item[] = itemsResult.error ? [] : (itemsResult.data ?? []);
  const itemsError = itemsResult.error
    ? (itemsResult.error.message ?? "Could not load items. Please try again.")
    : null;

  // Get counts of managers and items for each subcategory
  const subcategoriesWithCounts = await Promise.all(
    subcategories.map(async (subcategory) => {
      const [managersResult, itemsResult] = await Promise.all([
        supabase
          .from("managers")
          .select("id")
          .eq("parent_id", subcategory.id),
        supabase
          .from("manager_item")
          .select("id")
          .eq("manager_id", subcategory.id),
      ]);

      const managersCount = managersResult?.data?.length ?? 0;
      const itemsCount = itemsResult?.data?.length ?? 0;

      return {
        ...subcategory,
        managersCount,
        itemsCount,
      };
    })
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {manager.manager_name}
      </h1>

      <AddChildForms managerId={manager.id} />

      <div className="flex min-h-0 flex-1 gap-6">
        <div className="min-h-0 w-3/4 overflow-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-900">
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th scope="col" className="w-56">
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-1.5 px-4 py-3 text-left text-sm font-semibold text-zinc-900 transition hover:text-zinc-950 dark:text-zinc-50 dark:hover:text-white"
                  >
                    Subcategory Name
                  </button>
                </th>
                <th scope="col" className="w-40">
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-1.5 px-4 py-3 text-left text-sm font-semibold text-zinc-900 transition hover:text-zinc-950 dark:text-zinc-50 dark:hover:text-white"
                  >
                    Subcategories
                  </button>
                </th>
                <th scope="col" className="w-36">
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-1.5 px-4 py-3 text-left text-sm font-semibold text-zinc-900 transition hover:text-zinc-950 dark:text-zinc-50 dark:hover:text-white"
                  >
                    Total Items
                  </button>
                </th>
                <th scope="col" className="w-56">
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
              {subcategoriesError ? (
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-3">
                    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                      Could not load manager data. Please try again.
                    </p>
                  </td>
                </tr>
              ) : subcategories.length === 0 ? (
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-3">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      No subcategories found
                    </p>
                  </td>
                </tr>
              ) : (
                <SubcategoryRows rows={subcategoriesWithCounts} />
              )}
            </tbody>
          </table>
        </div>

        <div className="min-h-0 w-1/4 overflow-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-900">
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th scope="col">
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-1.5 px-4 py-3 text-left text-sm font-semibold text-zinc-900 transition hover:text-zinc-950 dark:text-zinc-50 dark:hover:text-white"
                  >
                    Item Name
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {itemsError ? (
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-3">
                    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                      Could not load items. Please try again.
                    </p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-3">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      No items found
                    </p>
                  </td>
                </tr>
              ) : (
                <ItemRows rows={items} />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
