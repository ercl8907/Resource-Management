import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Server is not configured. Check Supabase env vars in .env.local." },
      { status: 500 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: managers, error } = await supabase
    .from("managers")
    .select("id, manager_name, user_id, user_manager_id, created_at")
    .is("parent_id", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[managers/list]", error);
    return NextResponse.json(
      {
        error: error.message ?? "Could not load managers. Please try again.",
        detail: process.env.NODE_ENV !== "production" ? { message: error.message, code: error.code } : undefined,
      },
      { status: 500 }
    );
  }

  // Count each manager's direct subcategories (managers rows whose parent_id
  // points at it).
  const { data: subcategories, error: subcategoriesError } = await supabase
    .from("managers")
    .select("parent_id")
    .not("parent_id", "is", null);

  if (subcategoriesError) {
    console.error("[managers/list] subcategory counts", subcategoriesError);
    return NextResponse.json(
      {
        error:
          subcategoriesError.message ??
          "Could not load managers. Please try again.",
        detail:
          process.env.NODE_ENV !== "production"
            ? {
                message: subcategoriesError.message,
                code: subcategoriesError.code,
              }
            : undefined,
      },
      { status: 500 }
    );
  }

  const subcategoryCounts = new Map<string, number>();
  for (const subcategory of subcategories ?? []) {
    if (!subcategory.parent_id) continue;
    subcategoryCounts.set(
      subcategory.parent_id,
      (subcategoryCounts.get(subcategory.parent_id) ?? 0) + 1
    );
  }

  // Count the manager_item rows attached to each manager.
  const { data: items, error: itemsError } = await supabase
    .from("manager_item")
    .select("manager_id");

  if (itemsError) {
    console.error("[managers/list] item counts", itemsError);
  }

  const itemCounts = new Map<string, number>();
  for (const item of items ?? []) {
    if (!item.manager_id) continue;
    itemCounts.set(
      item.manager_id,
      (itemCounts.get(item.manager_id) ?? 0) + 1
    );
  }

  const managersWithCounts = (managers ?? []).map((manager) => ({
    ...manager,
    subcategory_count: subcategoryCounts.get(manager.id) ?? 0,
    item_count: itemCounts.get(manager.id) ?? 0,
    user_manager_id: manager.user_manager_id,
  }));

  return NextResponse.json({ managers: managersWithCounts });
}
