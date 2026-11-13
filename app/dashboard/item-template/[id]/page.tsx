import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";

// The template lookup must run before anything is sent to the browser, so this
// route blocks instead of being prerendered with a static shell.
export const instant = false;

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const pad = (part: number) => String(part).padStart(2, "0");

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join(" ");
}

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

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {template.template_name}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Item template created {formatDateTime(template.created_at)}
        </p>
      </div>

      <Link
        href="/dashboard/item-template"
        className="w-fit text-sm font-medium text-zinc-900 underline-offset-4 transition hover:underline dark:text-zinc-50"
      >
        ← Back to item templates
      </Link>
    </div>
  );
}
