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

  const { manager_name, item_template_id } = (body ?? {}) as {
    manager_name?: unknown;
    item_template_id?: unknown;
  };

  if (typeof manager_name !== "string" || !manager_name.trim()) {
    return NextResponse.json(
      { error: "Please enter a subcategory name." },
      { status: 400 }
    );
  }

  if (typeof item_template_id !== "string" || !item_template_id.trim()) {
    return NextResponse.json(
      { error: "Please select an item template." },
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
    console.error("[managers/[id]/subcategories] parent lookup", parentError);
    return NextResponse.json(
      { error: "Could not add subcategory. Please try again." },
      { status: 500 }
    );
  }

  if (!parent) {
    return NextResponse.json({ error: "Manager not found." }, { status: 404 });
  }

  const templateId = item_template_id.trim();
  const { data: template, error: templateError } = await supabase
    .from("item_template")
    .select("template_user_id")
    .eq("template_user_id", templateId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (templateError) {
    console.error("[managers/[id]/subcategories] template lookup", templateError);
    return NextResponse.json(
      { error: "Could not verify the item template. Please try again." },
      { status: 500 }
    );
  }

  if (!template) {
    return NextResponse.json({ error: "Item template not found." }, { status: 404 });
  }

  const subcategoryName = manager_name.trim();

  const { data: existing, error: lookupError } = await supabase
    .from("managers")
    .select("id")
    .eq("parent_id", id)
    .eq("manager_name", subcategoryName)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("[managers/[id]/subcategories] duplicate check", lookupError);
    return NextResponse.json(
      { error: "Could not add subcategory. Please try again." },
      { status: 500 }
    );
  }

  if (existing) {
    return NextResponse.json(
      { error: "Subcategory name already exists" },
      { status: 409 }
    );
  }

  const { data: subcategory, error } = await supabase
    .from("managers")
    .insert({
      manager_name: subcategoryName,
      user_id: user.id,
      parent_id: id,
      item_template_id: templateId,
    })
    .select("id, manager_name, parent_id, item_template_id, user_id, created_at")
    .single();

  if (error) {
    // A concurrent request may have inserted the same name under this parent
    // between the check above and this insert (unique constraint violation).
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Subcategory name already exists" },
        { status: 409 }
      );
    }

    console.error("[managers/[id]/subcategories]", error);
    return NextResponse.json(
      {
        error: error.message ?? "Could not add subcategory. Please try again.",
        detail:
          process.env.NODE_ENV !== "production"
            ? { message: error.message, code: error.code }
            : undefined,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ subcategory }, { status: 201 });
}
