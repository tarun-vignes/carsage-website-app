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
      console.log('Reset password page loaded, URL:', window.location.href); // Debug log
      console.log('Hash params:', window.location.hash); // Debug log

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      console.log('Access token present:', !!accessToken); // Debug log
      console.log('Refresh token present:', !!refreshToken); // Debug log

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          console.error('Session error:', sessionError); // Debug log
          setError(sessionError.message);
          return;
        }
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();

      console.log('Session established:', !!session); // Debug log

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
              Choose a new password for your Autovaro account. After saving it, you will be sent back to the login page.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
              <p className="metric-label">🔐 Secure reset</p>
              <p className="mt-2 text-sm text-slate-700">This link is valid for 24 hours and can only be used once.</p>
            </div>
            <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
              <p className="metric-label">Password requirements</p>
              <p className="mt-2 text-sm text-slate-700">Use at least 8 characters with a mix of letters and numbers for security.</p>
            </div>
            <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
              <p className="metric-label">🚗 Autovaro branded</p>
              <p className="mt-2 text-sm text-slate-700">Your password reset is handled securely by Autovaro, not third-party services.</p>
            </div>
          </div>
        </section>

        <section className="surface-card w-full p-6 sm:p-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-[#0b3f9e]/10 flex items-center justify-center">
              <svg className="h-6 w-6 text-[#0b3f9e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="eyebrow mt-4">Secure password reset</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Set your new password</h2>
            <p className="mt-2 text-sm text-slate-600">Enter a strong password to secure your Autovaro account.</p>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">New password</span>
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={!isRecoveryReady || isSubmitting}
                placeholder="Enter at least 8 characters"
                className="w-full"
              />
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Confirm new password</span>
              <input
                required
                type="password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={!isRecoveryReady || isSubmitting}
                placeholder="Re-enter your password"
                className="w-full"
              />
            </label>

            {!isRecoveryReady && !error && (
              <div className="rounded-xl bg-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent"></div>
                  <p className="text-sm text-slate-700">Validating your reset link...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-rose-50 px-4 py-3 border border-rose-200">
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}
            {successMessage && (
              <div className="rounded-xl bg-emerald-50 px-4 py-3 border border-emerald-200">
                <p className="text-sm text-emerald-700">{successMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!isRecoveryReady || isSubmitting}
              className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Updating password...
                </div>
              ) : (
                "Save new password"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Remember your password?{" "}
              <Link href="/login" className="font-semibold text-[#0b3f9e] underline underline-offset-4 hover:text-[#0b3f9e]/80">
                Back to log in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
