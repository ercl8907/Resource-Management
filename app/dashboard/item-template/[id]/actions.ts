"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AddPropertyFieldState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function addPropertyField(
  _previousState: AddPropertyFieldState,
  formData: FormData
): Promise<AddPropertyFieldState> {
  const propertyName = (formData.get("propertyName") as string | null)?.trim();
  const propertyLength = (formData.get("propertyLength") as string | null)?.trim();
  const templateId = (formData.get("templateId") as string | null)?.trim();

  if (!propertyName || !propertyLength || !templateId) {
    return {
      status: "error",
      message: "Enter a property name and length before submitting.",
    };
  }

  if (!/^\d+$/.test(propertyLength) || Number(propertyLength) <= 0) {
    return {
      status: "error",
      message: "Property length must be a positive whole number.",
    };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return {
      status: "error",
      message: "Server is not configured. Check Supabase env vars in .env.local.",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/");
  }

  // Verify the template belongs to the signed-in user before writing. The
  // service-role client below bypasses RLS, so this ownership check is required.
  const { data: template, error: templateError } = await supabase
    .from("item_template")
    .select("id")
    .eq("id", templateId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (templateError) {
    console.error("[item-template/[id]] template lookup", templateError);
    return {
      status: "error",
      message: "Could not verify the template. Please try again.",
    };
  }

  if (!template) {
    return { status: "error", message: "Template not found." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      status: "error",
      message: "Server is not configured. Check Supabase env vars in .env.local.",
    };
  }

  // Reject a second property with the same name on this template for this user.
  const { data: existingProperty, error: duplicateError } = await admin
    .from("item_template_variables")
    .select("id")
    .eq("user_id", user.id)
    .eq("item_template_id", templateId)
    .eq("variable_name", propertyName)
    .limit(1)
    .maybeSingle();

  if (duplicateError) {
    console.error("[item-template/[id]] duplicate check", duplicateError);
    return {
      status: "error",
      message: "Could not check for duplicate property names. Please try again.",
    };
  }

  if (existingProperty) {
    return {
      status: "error",
      message: "A property field with this name already exists.",
    };
  }

  // The deployed variables table only has a SELECT policy, so an anon-client
  // insert is rejected by RLS. The service-role client is safe here because the
  // user and template ownership were checked above.
  const { error: insertError } = await admin.from("item_template_variables").insert({
    variable_name: propertyName,
    variable_length: Number(propertyLength),
    item_template_id: templateId,
    user_id: user.id,
  });

  if (insertError) {
    console.error("[item-template/[id]] insert variable", insertError);
    return {
      status: "error",
      message: insertError.message ?? "Could not add the property field. Please try again.",
    };
  }

  revalidatePath("/dashboard/item-template/[id]", "page");

  return { status: "success", message: "Property field added." };
}

export type RenameVariableState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function renameTemplateVariable(
  variableId: string,
  variableName: string
): Promise<RenameVariableState> {
  const trimmedName = variableName.trim();

  if (!variableId || !trimmedName) {
    return { status: "error", message: "Enter a variable name before saving." };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return {
      status: "error",
      message: "Server is not configured. Check Supabase env vars in .env.local.",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/");
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      status: "error",
      message: "Server is not configured. Check Supabase env vars in .env.local.",
    };
  }

  // The service-role client bypasses RLS, so verify the variable belongs to the
  // signed-in user before updating it.
  const { data: variable, error: variableError } = await admin
    .from("item_template_variables")
    .select("id, item_template_id")
    .eq("id", variableId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (variableError) {
    console.error("[item-template/[id]] variable lookup", variableError);
    return {
      status: "error",
      message: "Could not verify the variable. Please try again.",
    };
  }

  if (!variable) {
    return { status: "error", message: "Variable not found." };
  }

  // Reject a rename that collides with another property on the same template.
  const { data: existingProperty, error: duplicateError } = await admin
    .from("item_template_variables")
    .select("id")
    .eq("user_id", user.id)
    .eq("item_template_id", variable.item_template_id)
    .eq("variable_name", trimmedName)
    .neq("id", variableId)
    .limit(1)
    .maybeSingle();

  if (duplicateError) {
    console.error("[item-template/[id]] duplicate check", duplicateError);
    return {
      status: "error",
      message: "Could not check for duplicate property names. Please try again.",
    };
  }

  if (existingProperty) {
    return {
      status: "error",
      message: "A property field with this name already exists.",
    };
  }

  const { error: updateError } = await admin
    .from("item_template_variables")
    .update({ variable_name: trimmedName })
    .eq("id", variableId)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("[item-template/[id]] rename variable", updateError);
    return {
      status: "error",
      message: updateError.message ?? "Could not rename the variable. Please try again.",
    };
  }

  revalidatePath("/dashboard/item-template/[id]", "page");

  return { status: "success", message: "Variable renamed." };
}

export type UpdateVariableLengthState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function updateTemplateVariableLength(
  variableId: string,
  variableLength: string
): Promise<UpdateVariableLengthState> {
  const trimmedLength = variableLength.trim();

  if (!variableId) {
    return { status: "error", message: "Variable not found." };
  }

  const lengthValue = Number(trimmedLength);
  if (!/^\d+$/.test(trimmedLength) || !Number.isSafeInteger(lengthValue) || lengthValue <= 1) {
    return {
      status: "error",
      message: "Length must be a positive whole number greater than 1.",
    };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return {
      status: "error",
      message: "Server is not configured. Check Supabase env vars in .env.local.",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/");
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      status: "error",
      message: "Server is not configured. Check Supabase env vars in .env.local.",
    };
  }

  // The service-role client bypasses RLS, so verify the variable belongs to the
  // signed-in user before updating it.
  const { data: variable, error: variableError } = await admin
    .from("item_template_variables")
    .select("id")
    .eq("id", variableId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (variableError) {
    console.error("[item-template/[id]] variable lookup", variableError);
    return {
      status: "error",
      message: "Could not verify the variable. Please try again.",
    };
  }

  if (!variable) {
    return { status: "error", message: "Variable not found." };
  }

  const { error: updateError } = await admin
    .from("item_template_variables")
    .update({ variable_length: lengthValue })
    .eq("id", variableId)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("[item-template/[id]] update variable length", updateError);
    return {
      status: "error",
      message: updateError.message ?? "Could not update the length. Please try again.",
    };
  }

  revalidatePath("/dashboard/item-template/[id]", "page");

  return { status: "success", message: "Variable length updated." };
}

export type SwapVariableOrderState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function swapTemplateVariableOrder(
  variableId: string,
  otherVariableId: string
): Promise<SwapVariableOrderState> {
  if (!variableId || !otherVariableId || variableId === otherVariableId) {
    return { status: "error", message: "Choose another variable to swap with." };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return {
      status: "error",
      message: "Server is not configured. Check Supabase env vars in .env.local.",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/");
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      status: "error",
      message: "Server is not configured. Check Supabase env vars in .env.local.",
    };
  }

  // The service-role client bypasses RLS, so verify both variables belong to
  // the signed-in user and to the same template before swapping their orders.
  const { data: variables, error: lookupError } = await admin
    .from("item_template_variables")
    .select("id, item_template_id, item_order")
    .in("id", [variableId, otherVariableId])
    .eq("user_id", user.id);

  if (lookupError) {
    console.error("[item-template/[id]] reorder lookup", lookupError);
    return {
      status: "error",
      message: "Could not verify the variables. Please try again.",
    };
  }

  if (
    variables?.length !== 2 ||
    variables[0].item_template_id !== variables[1].item_template_id
  ) {
    return { status: "error", message: "Variables not found." };
  }

  const variable = variables.find((entry) => entry.id === variableId);
  const otherVariable = variables.find((entry) => entry.id === otherVariableId);

  if (
    !variable ||
    !otherVariable ||
    typeof variable.item_order !== "number" ||
    typeof otherVariable.item_order !== "number"
  ) {
    return { status: "error", message: "One of these variables has no order value." };
  }

  const { error: firstUpdateError } = await admin
    .from("item_template_variables")
    .update({ item_order: otherVariable.item_order })
    .eq("id", variable.id)
    .eq("user_id", user.id);

  if (firstUpdateError) {
    console.error("[item-template/[id]] swap variable order", firstUpdateError);
    return {
      status: "error",
      message: firstUpdateError.message ?? "Could not update the order. Please try again.",
    };
  }

  const { error: secondUpdateError } = await admin
    .from("item_template_variables")
    .update({ item_order: variable.item_order })
    .eq("id", otherVariable.id)
    .eq("user_id", user.id);

  if (secondUpdateError) {
    console.error("[item-template/[id]] swap variable order", secondUpdateError);
    // Restore the first row so a partial swap doesn't leave the list inconsistent.
    await admin
      .from("item_template_variables")
      .update({ item_order: variable.item_order })
      .eq("id", variable.id)
      .eq("user_id", user.id);
    return {
      status: "error",
      message: secondUpdateError.message ?? "Could not update the order. Please try again.",
    };
  }

  revalidatePath("/dashboard/item-template/[id]", "page");

  return { status: "success", message: "Variable order updated." };
}
