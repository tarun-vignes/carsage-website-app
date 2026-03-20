import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { AccessibilityControls } from "@/components/accessibility-controls";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Autovaro",
  description: "Data-informed negotiation guidance before you buy a car.",
  icons: {
    icon: "/autovaro-icon.png",
    shortcut: "/autovaro-icon.png",
    apple: "/autovaro-icon.png"
  }
};

const isSupabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user: { id: string } | null = null;

  if (isSupabaseConfigured) {
    const supabase = createSupabaseServerClient();
    const {
      data: { user: currentUser }
    } = await supabase.auth.getUser();

    user = currentUser;
  }

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col" translate="yes">
        <header className="site-header">
          <div className="page-wrap flex h-[108px] items-center justify-between gap-8">
            <Link href="/" className="flex items-center">
              <Image
                src="/autovaro-logo.png"
                alt="Autovaro"
                width={540}
                height={120}
                priority
                className="h-auto w-[360px] sm:w-[430px]"
              />
            </Link>
            <nav className="flex items-center gap-2 self-center text-sm text-slate-700">
              <Link href="/check" className="site-nav-link">
                Check Listing
              </Link>
              {user ? (
                <>
                  <Link href="/dashboard" className="site-nav-link">
                    Dashboard
                  </Link>
                  <Link href="/logout" className="btn-secondary-nav">
                    Sign out
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="site-nav-link">
                    Log in
                  </Link>
                  <Link href="/signup" className="btn-primary-nav">
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <div className="flex-1 pb-12">{children}</div>
        <footer className="site-footer">
          <div className="page-wrap grid gap-4 sm:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="text-sm font-semibold text-slate-800">Autovaro</p>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">
                Autovaro provides educational pricing guidance based on aggregated market data. Estimates are not guarantees
                and may not reflect final out-the-door pricing.
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Navigation</p>
              <div className="mt-2 flex flex-wrap gap-3 text-sm sm:justify-end">
                <Link href="/check" className="text-slate-700 hover:text-slate-900">
                  Check Listing
                </Link>
                <Link href="/dashboard" className="text-slate-700 hover:text-slate-900">
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        </footer>
        <AccessibilityControls />
      </body>
    </html>
  );
}
