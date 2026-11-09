import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
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

  const { data: parent, error: parentError } = await supabase
    .from("managers")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (parentError) {
    console.error("[managers/[id]/items] parent lookup", parentError);
    return NextResponse.json(
      { error: "Could not add item. Please try again." },
      { status: 500 }
    );
  }

  if (!parent) {
    return NextResponse.json({ error: "Manager not found." }, { status: 404 });
  }

  const itemName = item_name.trim();

  const { data: existing, error: lookupError } = await supabase
    .from("manager_item")
    .select("id")
    .eq("manager_id", id)
    .eq("item_name", itemName)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("[managers/[id]/items] duplicate check", lookupError);
    return NextResponse.json(
      { error: "Could not add item. Please try again." },
      { status: 500 }
    );
  }

  if (existing) {
    return NextResponse.json(
      { error: "Item name already exists" },
      { status: 409 }
    );
  }

  const { data: item, error } = await supabase
    .from("manager_item")
    .insert({
      item_name: itemName,
      user_id: user.id,
      manager_id: id,
    })
    .select("*")
    .single();

  if (error) {
    // A concurrent request may have inserted the same name under this manager
    // between the check above and this insert (unique constraint violation).
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Item name already exists" },
        { status: 409 }
      );
    }

    console.error("[managers/[id]/items]", error);
    return NextResponse.json(
      {
        error: error.message ?? "Could not add item. Please try again.",
        detail:
          process.env.NODE_ENV !== "production"
            ? { message: error.message, code: error.code }
            : undefined,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ item }, { status: 201 });
}
