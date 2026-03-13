"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsSubmitting(false);
      return;
    }

    if (data.session) {
      setSuccessMessage("Account created. You can now use CarSage immediately.");
      router.push("/dashboard");
      router.refresh();
    } else {
      setSuccessMessage("Account created. Check your email to confirm, then log in.");
      router.push("/login");
    }

    setIsSubmitting(false);
  }

  return (
    <main className="page-wrap py-12">
      <div className="auth-shell items-stretch">
        <section className="surface-card flex flex-col justify-between p-6 sm:p-8">
          <div>
            <p className="eyebrow">Get started</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Create your CarSage account</h1>
            <p className="mt-3 max-w-lg text-sm leading-7 text-slate-600">
              Start with free previews, then unlock full negotiation reports only when a listing is worth pursuing.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
              <p className="metric-label">Free first look</p>
              <p className="mt-2 text-sm text-slate-700">See the score, price signal, and one clear insight before paying.</p>
            </div>
            <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
              <p className="metric-label">$9 unlock model</p>
              <p className="mt-2 text-sm text-slate-700">Pay only for the listings where you want the full offer ladder and script.</p>
            </div>
            <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
              <p className="metric-label">No subscriptions</p>
              <p className="mt-2 text-sm text-slate-700">This MVP is designed for one-time reports, not recurring billing.</p>
            </div>
          </div>
        </section>

        <section className="surface-card w-full p-6 sm:p-8">
          <p className="eyebrow">Account creation</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Sign up</h2>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Email</span>
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Password</span>
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            {successMessage && (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {successMessage}
              </p>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:opacity-60">
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-slate-900 underline underline-offset-4">
              Log in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
