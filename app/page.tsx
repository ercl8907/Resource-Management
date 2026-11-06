import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignInForm } from "./sign-in-form";

// The session check must run before anything is sent to the browser, so this
// route blocks instead of being prerendered with a static shell.
export const instant = false;

export default async function SignInPage() {
  // Check the session on the server before rendering the form so a signed-in
  // user never receives the sign-in page (including via the browser back
  // button, which re-requests the route).
  let isSignedIn = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isSignedIn = Boolean(user);
  } catch {
    // Supabase env vars are missing or the check failed — show the form so
    // the client component can surface a useful error.
  }

  if (isSignedIn) {
    redirect("/dashboard");
  }

  return <SignInForm />;
}
