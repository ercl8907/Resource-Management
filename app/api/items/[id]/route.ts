import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  // Match either the user-facing id or the internal id so the breadcrumb can
  // still resolve items that don't have a user_item_id yet.
  const [itemByUserItemId, itemByInternalId] = await Promise.all([
    supabase
      .from("manager_item")
      .select("id, item_name, user_item_id")
      .eq("user_item_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("manager_item")
      .select("id, item_name, user_item_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const item = itemByUserItemId.data ?? itemByInternalId.data;
  const error = itemByUserItemId.error ?? itemByInternalId.error;

  if (error) {
    console.error("[items/[id]]", error);
    return NextResponse.json(
      { error: error.message ?? "Could not load item. Please try again." },
      { status: 500 }
    );
  }

  if (!item) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { item_name } = (body ?? {}) as { item_name?: unknown };

  if (typeof item_name !== "string" || !item_name.trim()) {
    return NextResponse.json(
      { error: "Please enter an item name." },
      { status: 400 }
    );
  }

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

  const { data: item, error: lookupError } = await supabase
    .from("manager_item")
    .select("id, item_name, manager_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError) {
    console.error("[items/[id]] rename lookup", lookupError);
    return NextResponse.json(
      { error: "Could not update item name. Please try again." },
      { status: 500 }
    );
  }

  // Missing, or the item belongs to a different user.
  if (!item) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  const itemName = item_name.trim();

  if (itemName === item.item_name) {
    return NextResponse.json({
      item: { id: item.id, item_name: item.item_name },
    });
  }

  // Item names stay unique within the same manager.
  const { data: existing, error: duplicateError } = await supabase
    .from("manager_item")
    .select("id")
    .eq("manager_id", item.manager_id)
    .eq("item_name", itemName)
    .neq("id", id)
    .limit(1)
    .maybeSingle();

  if (duplicateError) {
    console.error("[items/[id]] rename duplicate check", duplicateError);
    return NextResponse.json(
      { error: "Could not update item name. Please try again." },
      { status: 500 }
    );
  }

  if (existing) {
    return NextResponse.json(
      { error: "Item name already exists" },
      { status: 409 }
    );
  }

  const { data: updatedItem, error: updateError } = await supabase
    .from("manager_item")
    .update({ item_name: itemName })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, item_name")
    .single();

  if (updateError) {
    // A concurrent request may have renamed this item (or created a
    // duplicate) between the check above and this update.
    if (updateError.code === "23505") {
      return NextResponse.json(
        { error: "Item name already exists" },
        { status: 409 }
      );
    }

    console.error("[items/[id]] rename update", updateError);
    return NextResponse.json(
      { error: "Could not update item name. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ item: updatedItem });
}
