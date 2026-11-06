"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type Errors = Partial<Record<"email" | "password" | "form", string>>;

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const isLoading = isSubmitting || isNavigating || isRestoring;

  // The server component already redirects signed-in users on normal loads.
  // This covers the browser's back/forward cache, which restores the page
  // without re-running React effects or re-requesting the route.
  useEffect(() => {
    let active = true;

    async function redirectIfSignedIn() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();

        if (!active) return;

        if (data.session) {
          setIsNavigating(true);
          router.replace("/dashboard");
          return;
        }
      } catch {
        // If the session check fails, fall back to showing the sign-in form.
      }

      if (active) setIsRestoring(false);
    }

    function handlePageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;

      // Hide the restored page immediately while the session check runs so
      // the sign-in form doesn't linger on screen.
      setIsRestoring(true);
      redirectIfSignedIn();
    }

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      active = false;
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [router]);

  function validate(): Errors {
    const nextErrors: Errors = {};

    if (!email.trim()) nextErrors.email = "Please enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      nextErrors.email = "Please enter a valid email address.";

    if (!password) nextErrors.password = "Please enter your password.";

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Supabase reports a wrong email/password combination as
        // "invalid_credentials". Clear the rejected password so it has to be
        // typed again, while keeping the email address in place.
        if (error.code === "invalid_credentials") {
          setPassword("");
        }

        setErrors({ form: error.message ?? "Could not sign in. Please try again." });
        return;
      }

      // Keep the loader up until the dashboard page mounts.
      // Replace so the browser back button skips the sign-in page.
      setIsNavigating(true);
      router.replace("/dashboard");
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : "Network error. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = (hasError?: string) =>
    [
      "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400",
      "outline-none transition focus:ring-2 focus:ring-zinc-900 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-50",
      hasError
        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
        : "border-zinc-300 focus:border-zinc-900 dark:border-zinc-700",
    ].join(" ");

  const errorId = (field: keyof Errors) => `error-${field}`;
  const describedBy = (field: keyof Errors) => (errors[field] ? errorId(field) : undefined);

  return (
    <main className="relative flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      {isLoading && (
        <div
          role="status"
          aria-label={isRestoring ? "Checking your session" : "Loading dashboard"}
          className={[
            "fixed inset-0 z-50 flex items-center justify-center",
            isRestoring ? "bg-zinc-50 dark:bg-black" : "bg-zinc-950/5 dark:bg-zinc-50/5",
          ].join(" ")}
        >
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-950/20 border-t-zinc-950/60 dark:border-zinc-50/20 dark:border-t-zinc-50/60" />
        </div>
      )}
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-10">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Sign in to continue to Resource Management.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
          {errors.form && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {errors.form}
            </p>
          )}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={describedBy("email")}
              className={inputClass(errors.email)}
            />
            {errors.email && (
              <p id={errorId("email")} role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={describedBy("password")}
                className={`${inputClass(errors.password)} pr-20`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && (
              <p id={errorId("password")} role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                {errors.password}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end">
            <Link href="/forgot-password" className="text-sm font-medium text-zinc-950 underline underline-offset-4 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="font-medium text-zinc-950 underline underline-offset-4 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
