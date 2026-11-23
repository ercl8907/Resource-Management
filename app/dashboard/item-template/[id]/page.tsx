import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AddPropertyFieldForm } from "./add-property-field-form";
import { VariablesTable } from "./variables-table";

// The template lookup must run before anything is sent to the browser, so this
// route blocks instead of being prerendered with a static shell.
export const instant = false;

export default async function ItemTemplateDetailPage({
  params,
}: PageProps<"/dashboard/item-template/[id]">) {
  // Render at request time: auth.getUser() reads the current time while
  // validating the session, which isn't allowed during prerendering.
  await connection();

  const { id } = await params;

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        Could not load template. Please try again.
      </p>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Templates are addressed by their user-facing id, but older rows (or rows
  // created before that column was populated) may not have one. Look up both
  // so links that fall back to the internal id still resolve.
  const [templateByUserTemplateId, templateByInternalId] = await Promise.all([
    supabase
      .from("item_template")
      .select("id, template_name, template_user_id, created_at")
      .eq("template_user_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("item_template")
      .select("id, template_name, template_user_id, created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const template = templateByUserTemplateId.data ?? templateByInternalId.data;
  const templateError = templateByUserTemplateId.error ?? templateByInternalId.error;

  if (templateError) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {templateError.message ?? "Could not load template. Please try again."}
      </p>
    );
  }

  // Missing, or the template belongs to a different user.
  if (!template) {
    redirect("/dashboard/item-template");
  }

  // The variables table has no SELECT policy in the deployed database, so read
  // it with the service-role client after the template ownership check above.
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        Could not load template variables. Please try again.
      </p>
    );
  }

  const { data: variables, error: variablesError } = await admin
    .from("item_template_variables")
    .select("*")
    .eq("user_id", user.id)
    .eq("item_template_id", template.id)
    .order("item_order", { ascending: true, nullsFirst: false });

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {template.template_name}
        </h1>
      </div>

      <AddPropertyFieldForm templateId={template.id} />

      <div className="mt-6 flex min-h-0 flex-1 flex-col gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Template Variables
        </h2>
        {variablesError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {variablesError.message ?? "Could not load template variables."}
          </p>
        )}
        <VariablesTable variables={variables ?? []} />
      </div>
    </div>
  );
}
