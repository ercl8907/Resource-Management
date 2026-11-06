import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// The session check must run before rendering so signed-in users never see
// this page (it lives outside the dashboard layout and has no nav bars).
export const instant = false;

export default async function AccountCreatedPage() {
  let isSignedIn = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isSignedIn = Boolean(user);
  } catch {
    // Supabase env vars are missing or the check failed — show the page.
  }

  if (isSignedIn) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-10">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Account has been successfully created
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          You can now sign in with your new account.
        </p>
        <Link
          href="/"
          className="mt-8 w-full rounded-lg bg-zinc-950 px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Go to sign in
        </Link>
      </div>
    </main>
  );
}
