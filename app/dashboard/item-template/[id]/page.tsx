import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection, revalidatePath } from "next/server";

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

async function addPropertyField(formData: FormData) {
  "use server";

  const propertyName = (formData.get("propertyName") as string | null)?.trim();
  const propertyLength = (formData.get("propertyLength") as string | null)?.trim();
  const templateId = formData.get("templateId") as string | null;

  if (!propertyName || !propertyLength || !templateId) {
    return;
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  await supabase.from("item_template_variables").insert({
    variable_name: propertyName,
    variable_length: propertyLength,
    item_template_id: templateId,
    user_id: user.id,
  });

  revalidatePath("/dashboard/item-template/[id]", "page");
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

  // Fetch variables for the template
  const { data: variables, error: variablesError } = await supabase
    .from("item_template_variables")
    .select("*")
    .eq("item_template_id", template?.id)
    .eq("user_id", user.id);

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
      </div>

      <form action={addPropertyField} className="max-w-md">
        <input type="hidden" name="templateId" value={template.id} />
        <label htmlFor="propertyName" className="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Property Name
        </label>
        <input
          id="propertyName"
          name="propertyName"
          type="text"
          placeholder="e.g. Quantity"
          required
          className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50 mb-4"
        />
        <label htmlFor="propertyLength" className="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Property Length
        </label>
        <input
          id="propertyLength"
          name="propertyLength"
          type="text"
          placeholder="e.g. 10"
          required
          className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
        />
        <button
          type="submit"
          className="mt-4 w-full cursor-pointer rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Add Property Field
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Template Variables
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full rounded-lg border border-zinc-300 bg-white text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
            <thead className="bg-zinc-100 dark:bg-zinc-800">
              <tr>
                <th className="w-1/3 px-4 py-2 text-left font-semibold">Variable Name</th>
                <th className="w-1/3 px-4 py-2 text-left font-semibold">Value</th>
                <th className="w-1/3 px-4 py-2 text-left font-semibold">Created At</th>
              </tr>
            </thead>
            <tbody>
              {variables?.map((variable) => (
                <tr key={variable.id} className="border-t border-zinc-300 dark:border-zinc-700">
                  <td className="px-4 py-2">{variable.variable_name}</td>
                  <td className="px-4 py-2">{variable.variable_value}</td>
                  <td className="px-4 py-2">{formatDateTime(variable.created_at)}</td>
                </tr>
              ))}
              {(!variables || variables.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-center text-zinc-500">
                    No variables found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
