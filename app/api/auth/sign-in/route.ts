import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, password } = (body ?? {}) as { email?: unknown; password?: unknown };

  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Please enter your email address." }, { status: 400 });
  }
  if (!isValidEmail(email.trim())) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Please enter your password." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Server is not configured. Check Supabase env vars in .env.local." },
      { status: 500 }
    );
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    console.error("[sign-in]", error);
    return NextResponse.json(
      {
        error: error.message ?? "Invalid email or password.",
        detail: process.env.NODE_ENV !== "production" ? { message: error.message, code: error.code, status: error.status } : undefined,
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    user: data.user
      ? { id: data.user.id, email: data.user.email, email_confirmed_at: data.user.email_confirmed_at }
      : null,
    session: data.session ? { access_token: data.session.access_token, refresh_token: data.session.refresh_token } : null,
  });
}
