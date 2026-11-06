import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages that signed-out users are allowed to see.
const PUBLIC_PATHS = ["/", "/sign-up", "/forgot-password", "/account-created"];

// Pages that signed-in users should be redirected away from.
const AUTH_PATHS = ["/", "/sign-up", "/forgot-password", "/account-created"];

function matchesPath(pathname: string, paths: string[]) {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isPublicPath(pathname: string) {
  return (
    matchesPath(pathname, PUBLIC_PATHS) ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/")
  );
}

// Never let the browser cache (or restore from bfcache) an auth page without
// revalidating, so a stale signed-out snapshot can't be shown after sign-in.
function withNoStore(response: NextResponse, pathname: string) {
  if (matchesPath(pathname, PUBLIC_PATHS)) {
    response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and the auth API don't need a session check.
  if (pathname.startsWith("/api/auth/") || pathname.startsWith("/_next/")) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    // Cannot verify session without env vars — let the request through.
    return withNoStore(NextResponse.next(), pathname);
  }

  // Create a client that keeps the refreshed auth cookies in sync
  // with the response.
  const response = withNoStore(NextResponse.next(), pathname);

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value);
        });
      },
    },
  });

  // Refresh the session and protect the route.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in users should never be sent back to the auth pages,
  // including via the browser back button.
  if (user && matchesPath(pathname, AUTH_PATHS)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return withNoStore(NextResponse.redirect(url), pathname);
  }

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return withNoStore(NextResponse.redirect(url), pathname);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|txt)$).*)",
  ],
};
