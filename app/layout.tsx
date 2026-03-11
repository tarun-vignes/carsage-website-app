import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { AccessibilityControls } from "@/components/accessibility-controls";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "CarSage",
  description: "Data-informed negotiation guidance before you buy a car."
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
          <div className="page-wrap flex h-[90px] items-center justify-between gap-4">
            <Link href="/" className="relative block h-12 w-[220px] overflow-hidden rounded-md sm:h-14 sm:w-[260px]">
              <Image
                src="/carsage-logo.png"
                alt="CarSage"
                fill
                priority
                sizes="(min-width: 640px) 260px, 220px"
                className="object-cover object-center"
              />
            </Link>
            <nav className="flex items-center gap-2 text-sm text-slate-700">
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
              <p className="text-sm font-semibold text-slate-800">CarSage</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                CarSage provides educational pricing guidance based on aggregated market data. Estimates are not guarantees
                and may not reflect final out-the-door pricing.
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs uppercase tracking-wide text-slate-500">Product</p>
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
