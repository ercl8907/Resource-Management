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

  const { data: templates, error } = await supabase
    .from("item_template")
    .select("id, template_name, user_id, template_user_id, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[item_templates/list]", error);
    return NextResponse.json(
      {
        error: error.message ?? "Could not load templates. Please try again.",
        detail: process.env.NODE_ENV !== "production" ? { message: error.message, code: error.code } : undefined,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ templates: templates ?? [] });
}
