"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [nextPath, setNextPath] = useState("/check");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/")) {
      setNextPath(next);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const {
      data: { session },
      error: signInError
    } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    if (!session) {
      setError("Sign-in did not establish a session. Please try again.");
      setIsSubmitting(false);
      return;
    }

    window.location.assign(nextPath);
  }

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetError(null);
    setResetMessage(null);
    setIsResetSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const redirectUrl = `${window.location.origin}/reset-password`;
    console.log('Password reset redirect URL:', redirectUrl); // Debug log

    const { error: resetRequestError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: redirectUrl
    });

    if (resetRequestError) {
      console.error('Password reset error:', resetRequestError); // Debug log
      setResetError(resetRequestError.message);
      setIsResetSubmitting(false);
      return;
    }

    setResetMessage("Password reset email sent. Check your inbox for the reset link.");
    setIsResetSubmitting(false);
  }

  return (
    <main className="page-wrap py-12">
      <div className="auth-shell items-stretch">
        <section className="surface-card flex flex-col justify-between p-6 sm:p-8">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Log in to view your reports</h1>
            <p className="mt-3 max-w-lg text-sm leading-7 text-slate-600">
              Purchased reports, saved previews, and future checkout history all live behind your Autovaro account.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="hero-panel p-4">
              <p className="metric-label">Saved reports</p>
              <p className="mt-2 text-sm text-slate-700">Keep every vehicle check tied to one dashboard.</p>
            </div>
            <div className="hero-panel p-4">
              <p className="metric-label">Locked to unlocked</p>
              <p className="mt-2 text-sm text-slate-700">Pay once per report when you need the full plan.</p>
            </div>
            <div className="hero-panel p-4">
              <p className="metric-label">Dealership ready</p>
              <p className="mt-2 text-sm text-slate-700">Return to the same numbers before you negotiate.</p>
            </div>
          </div>
        </section>

        <section className="surface-card w-full p-6 sm:p-8">
          <p className="eyebrow">Account access</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Sign in</h2>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Email</span>
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Password</span>
              <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:opacity-60">
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <button
              type="button"
              className="font-semibold text-[#0b3f9e] underline underline-offset-4"
              onClick={() => {
                setResetEmail(email);
                setResetError(null);
                setResetMessage(null);
                setIsResetOpen(true);
              }}
            >
              Reset password
            </button>
          </div>

          <p className="mt-5 text-sm text-slate-600">
            New to Autovaro?{" "}
            <Link href="/signup" className="font-semibold text-slate-900 underline underline-offset-4">
              Create account
            </Link>
          </p>
        </section>
      </div>

      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <div className="surface-card w-full max-w-md p-6">
            <div className="text-center mb-6">
              <div className="mx-auto h-12 w-12 rounded-full bg-[#0b3f9e]/10 flex items-center justify-center">
                <svg className="h-6 w-6 text-[#0b3f9e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="eyebrow mt-4">Password reset</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Reset your Autovaro password</h2>
              <p className="mt-2 text-sm text-slate-600">We'll send a secure reset link to your email.</p>
            </div>

            <form className="space-y-4" onSubmit={handlePasswordReset}>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-slate-700">Email address</span>
                <input
                  required
                  type="email"
                  value={resetEmail}
                  onChange={(event) => setResetEmail(event.target.value)}
                  placeholder="Enter your email"
                  className="w-full"
                />
              </label>

              {resetError && (
                <div className="rounded-xl bg-rose-50 px-4 py-3 border border-rose-200">
                  <p className="text-sm text-rose-700">{resetError}</p>
                </div>
              )}
              {resetMessage && (
                <div className="rounded-xl bg-emerald-50 px-4 py-3 border border-emerald-200">
                  <p className="text-sm text-emerald-700">{resetMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isResetSubmitting}
                className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isResetSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Sending reset link...
                  </div>
                ) : (
                  "Send reset link"
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-4"
                onClick={() => setIsResetOpen(false)}
              >
                Back to sign in
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

