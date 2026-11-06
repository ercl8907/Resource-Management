import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { manager_name } = (body ?? {}) as { manager_name?: unknown };

  if (typeof manager_name !== "string" || !manager_name.trim()) {
    return NextResponse.json({ error: "Please enter a manager name." }, { status: 400 });
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

  const { data: manager, error } = await supabase
    .from("managers")
    .insert({ manager_name: manager_name.trim(), user_id: user.id })
    .select("id, manager_name, user_id, created_at")
    .single();

  if (error) {
    console.error("[managers/new]", error);
    return NextResponse.json(
      {
        error: error.message ?? "Could not create manager. Please try again.",
        detail: process.env.NODE_ENV !== "production" ? { message: error.message, code: error.code } : undefined,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ manager }, { status: 201 });
}
