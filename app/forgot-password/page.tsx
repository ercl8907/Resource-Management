"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useState, type FormEvent } from "react";

type Errors = Partial<Record<"email" | "form", string>>;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  function validate(): Errors {
    const nextErrors: Errors = {};
    if (!email.trim()) nextErrors.email = "Please enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      nextErrors.email = "Please enter a valid email address.";
    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) {
        setErrors({ form: error.message ?? "Could not send reset email. Please try again." });
        return;
      }

      setSent(true);
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : "Network error. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-10">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Forgot password?
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {sent ? (
          <div
            role="status"
            className="mt-8 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
          >
            If an account exists for {email.trim()}, a reset email is on its way.
          </div>
        ) : (
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
                aria-describedby={errors.email ? "error-email" : undefined}
                className={[
                  "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400",
                  "outline-none transition focus:ring-2 focus:ring-zinc-900 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-50",
                  errors.email
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : "border-zinc-300 focus:border-zinc-900 dark:border-zinc-700",
                ].join(" ")}
              />
              {errors.email && (
                <p id="error-email" role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                  {errors.email}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {isSubmitting ? "Sending..." : "Confirm"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/" className="font-medium text-zinc-950 underline underline-offset-4 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
