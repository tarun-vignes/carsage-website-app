"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function prepareRecovery() {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          setError(sessionError.message);
          return;
        }
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        setError("This password reset link is invalid or has expired. Request a new reset email.");
        return;
      }

      setIsRecoveryReady(true);
    }

    prepareRecovery();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
      return;
    }

    await supabase.auth.signOut();
    setSuccessMessage("Password updated. Log in again with your new password.");
    setIsSubmitting(false);

    window.setTimeout(() => {
      router.push("/login");
    }, 1200);
  }

  return (
    <main className="page-wrap py-12">
      <div className="auth-shell items-stretch">
        <section className="surface-card flex flex-col justify-between p-6 sm:p-8">
          <div>
            <p className="eyebrow">Account recovery</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Reset your password</h1>
            <p className="mt-3 max-w-lg text-sm leading-7 text-slate-600">
              Choose a new password for your CarSage account. After saving it, you will be sent back to the login page.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
              <p className="metric-label">Recovery link required</p>
              <p className="mt-2 text-sm text-slate-700">This page works only from a valid password-reset email link.</p>
            </div>
            <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
              <p className="metric-label">Password rule</p>
              <p className="mt-2 text-sm text-slate-700">Use at least 8 characters so the account stays easy to manage later.</p>
            </div>
          </div>
        </section>

        <section className="surface-card w-full p-6 sm:p-8">
          <p className="eyebrow">New password</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Set a new password</h2>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">New password</span>
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={!isRecoveryReady || isSubmitting}
              />
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Confirm password</span>
              <input
                required
                type="password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={!isRecoveryReady || isSubmitting}
              />
            </label>

            {!isRecoveryReady && !error && (
              <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">Waiting for a valid recovery session...</p>
            )}

            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            {successMessage && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p>}

            <button type="submit" disabled={!isRecoveryReady || isSubmitting} className="btn-primary w-full disabled:opacity-60">
              {isSubmitting ? "Updating password..." : "Save new password"}
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-600">
            Back to{" "}
            <Link href="/login" className="font-semibold text-slate-900 underline underline-offset-4">
              log in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
