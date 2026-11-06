import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Supabase client using the anon key with cookie-based sessions.
 * Used for `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`.
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // `setAll` was called from a Server Component, where cookies are
          // read-only. Safe to ignore: middleware refreshes the session
          // cookies on each request.
        }
      },
    },
  });
}
