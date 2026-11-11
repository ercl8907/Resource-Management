import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";

// The item lookup must run before anything is sent to the browser, so this
// route blocks instead of being prerendered with a static shell.
export const instant = false;

export default async function ItemDetailPage({
  params,
}: PageProps<"/dashboard/existing-managers/item/[id]">) {
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
        Could not load item. Please try again.
      </p>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: item, error: itemError } = await supabase
    .from("manager_item")
    .select("id, item_name, manager_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (itemError) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {itemError.message ?? "Could not load item. Please try again."}
      </p>
    );
  }

  // Missing, or the item belongs to a different user.
  if (!item) {
    redirect("/dashboard");
  }

  const { data: manager } = await supabase
    .from("managers")
    .select("id, manager_name")
    .eq("id", item.manager_id)
    .maybeSingle();

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {item.item_name}
        </h1>
        {manager && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Item in{" "}
            <Link
              href={`/dashboard/existing-managers/${encodeURIComponent(manager.id)}`}
              className="font-medium text-zinc-900 underline-offset-4 transition hover:underline dark:text-zinc-50"
            >
              {manager.manager_name}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
