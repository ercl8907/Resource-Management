import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { template_name } = (body ?? {}) as { template_name?: unknown };

  if (typeof template_name !== "string" || !template_name.trim()) {
    return NextResponse.json(
      { error: "Please enter a template name." },
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

  const templateName = template_name.trim();

  const { data: existingTemplate, error: lookupError } = await supabase
    .from("item_template")
    .select("id")
    .eq("template_name", templateName)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("[item-templates/new] duplicate check", lookupError);
    return NextResponse.json(
      { error: "Could not create template. Please try again." },
      { status: 500 }
    );
  }

  if (existingTemplate) {
    return NextResponse.json(
      { error: "Template name already exists" },
      { status: 409 }
    );
  }

  const { data: template, error } = await supabase
    .from("item_template")
    .insert({ template_name: templateName, user_id: user.id })
    .select("id, template_name, user_id, template_user_id, created_at")
    .single();

  if (error) {
    console.error("[item-templates/new]", error);
    return NextResponse.json(
      {
        error: error.message ?? "Could not create template. Please try again.",
        detail:
          process.env.NODE_ENV !== "production"
            ? { message: error.message, code: error.code }
            : undefined,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ template }, { status: 201 });
}
