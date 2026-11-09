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

  const { data: manager, error } = await supabase
    .from("managers")
    .select("id, manager_name")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[managers/[id]]", error);
    return NextResponse.json(
      { error: error.message ?? "Could not load manager. Please try again." },
      { status: 500 }
    );
  }

  if (!manager) {
    return NextResponse.json({ error: "Manager not found." }, { status: 404 });
  }

  return NextResponse.json({ manager });
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

  const { manager_name } = (body ?? {}) as { manager_name?: unknown };

  if (typeof manager_name !== "string" || !manager_name.trim()) {
    return NextResponse.json(
      { error: "Please enter a manager name." },
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

  const { data: manager, error: lookupError } = await supabase
    .from("managers")
    .select("id, manager_name, parent_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError) {
    console.error("[managers/[id]] rename lookup", lookupError);
    return NextResponse.json(
      { error: "Could not update manager name. Please try again." },
      { status: 500 }
    );
  }

  if (!manager) {
    return NextResponse.json({ error: "Manager not found." }, { status: 404 });
  }

  const managerName = manager_name.trim();

  if (managerName === manager.manager_name) {
    return NextResponse.json({
      manager: { id: manager.id, manager_name: manager.manager_name },
    });
  }

  // Names stay unique within their level: top-level managers across the
  // user's list, subcategories within the same parent.
  const duplicateBase = supabase
    .from("managers")
    .select("id")
    .eq("manager_name", managerName)
    .eq("user_id", user.id)
    .neq("id", id);

  const { data: existing, error: duplicateError } = manager.parent_id
    ? await duplicateBase
        .eq("parent_id", manager.parent_id)
        .limit(1)
        .maybeSingle()
    : await duplicateBase.is("parent_id", null).limit(1).maybeSingle();

  if (duplicateError) {
    console.error("[managers/[id]] rename duplicate check", duplicateError);
    return NextResponse.json(
      { error: "Could not update manager name. Please try again." },
      { status: 500 }
    );
  }

  if (existing) {
    return NextResponse.json(
      {
        error: manager.parent_id
          ? "Subcategory name already exists"
          : "Manager name already exists",
      },
      { status: 409 }
    );
  }

  const { data: updatedManager, error: updateError } = await supabase
    .from("managers")
    .update({ manager_name: managerName })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, manager_name")
    .single();

  if (updateError) {
    console.error("[managers/[id]] rename update", updateError);
    return NextResponse.json(
      { error: "Could not update manager name. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ manager: updatedManager });
}
