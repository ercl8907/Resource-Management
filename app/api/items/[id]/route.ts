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

  const { data: item, error } = await supabase
    .from("manager_item")
    .select("id, item_name")
    .eq("id", id)
    .maybeSingle();

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
