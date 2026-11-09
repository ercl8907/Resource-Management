"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { clearLastActivity } from "@/lib/inactivity";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type Errors = Partial<Record<"email" | "password" | "confirmPassword" | "form", string>>;

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const isLoading = isSubmitting || isNavigating;

  function validate(): Errors {
    const nextErrors: Errors = {};

    if (!email.trim()) nextErrors.email = "Please enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      nextErrors.email = "Please enter a valid email address.";

    if (!password) nextErrors.password = "Please enter a password.";
    else if (password.length < 8)
      nextErrors.password = "Password must be at least 8 characters long.";

    if (!confirmPassword) nextErrors.confirmPassword = "Please confirm your password.";
    else if (confirmPassword !== password)
      nextErrors.confirmPassword = "Passwords do not match.";

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSubmitted(false);
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrors({ form: error.message ?? "Could not create account. Please try again." });
        setSubmitted(false);
        return;
      }

      // data.session is null when email confirmation is required.
      if (data.user) {
        if (data.session) {
          // The user is already signed in (email confirmation is disabled),
          // so go straight to the dashboard instead of the nav-less
          // /account-created confirmation page.
          clearLastActivity();
          setIsNavigating(true);
          router.replace("/dashboard");
        } else {
          setSubmitted(true);
        }
      } else {
        setErrors({ form: "Could not create account. Please try again." });
        setSubmitted(false);
      }
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : "Network error. Please try again.",
      });
      setSubmitted(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!submitted) return;
    // Replace so the browser back button skips the sign-up page.
    const timer = window.setTimeout(() => router.replace("/account-created"), 1000);
    return () => window.clearTimeout(timer);
  }, [submitted, router]);

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
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-10">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Sign up to get started with Resource Management.
          </p>
        </div>

        {submitted ? (
          <div
            role="status"
            className="mt-8 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
          >
            Account created successfully.{" "}
            <Link href="/" className="font-medium underline underline-offset-4">
              Sign in
            </Link>
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
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
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

            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={describedBy("confirmPassword")}
                className={inputClass(errors.confirmPassword)}
              />
              {errors.confirmPassword && (
                <p id={errorId("confirmPassword")} role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {isLoading ? "Creating account..." : "Sign up"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{" "}
          <Link href="/" className="font-medium text-zinc-950 underline underline-offset-4 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
