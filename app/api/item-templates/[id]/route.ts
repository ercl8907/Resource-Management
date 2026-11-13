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
  // still resolve templates that don't have a template_user_id yet.
  const [templateByUserTemplateId, templateByInternalId] = await Promise.all([
    supabase
      .from("item_template")
      .select("id, template_name, template_user_id")
      .eq("template_user_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("item_template")
      .select("id, template_name, template_user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const template = templateByUserTemplateId.data ?? templateByInternalId.data;
  const error = templateByUserTemplateId.error ?? templateByInternalId.error;

  if (error) {
    console.error("[item-templates/[id]]", error);
    return NextResponse.json(
      { error: error.message ?? "Could not load template. Please try again." },
      { status: 500 }
    );
  }

  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  return NextResponse.json({ template });
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

  const { data: template, error: lookupError } = await supabase
    .from("item_template")
    .select("id, template_name, template_user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError) {
    console.error("[item-templates/[id]] rename lookup", lookupError);
    return NextResponse.json(
      { error: "Could not update template name. Please try again." },
      { status: 500 }
    );
  }

  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const templateName = template_name.trim();

  if (templateName === template.template_name) {
    return NextResponse.json({
      template: {
        id: template.id,
        template_name: template.template_name,
        template_user_id: template.template_user_id,
      },
    });
  }

  const { data: existing, error: duplicateError } = await supabase
    .from("item_template")
    .select("id")
    .eq("template_name", templateName)
    .eq("user_id", user.id)
    .neq("id", id)
    .limit(1)
    .maybeSingle();

  if (duplicateError) {
    console.error("[item-templates/[id]] rename duplicate check", duplicateError);
    return NextResponse.json(
      { error: "Could not update template name. Please try again." },
      { status: 500 }
    );
  }

  if (existing) {
    return NextResponse.json(
      { error: "Template name already exists" },
      { status: 409 }
    );
  }

  const { data: updatedTemplate, error: updateError } = await supabase
    .from("item_template")
    .update({ template_name: templateName })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, template_name, template_user_id")
    .single();

  if (updateError) {
    console.error("[item-templates/[id]] rename update", updateError);
    return NextResponse.json(
      { error: "Could not update template name. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ template: updatedTemplate });
}
