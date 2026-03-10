import Link from "next/link";

const disclaimer =
  "CarSage provides educational pricing guidance based on aggregated market data. Estimates are not guarantees and may not reflect final out-the-door pricing.";

export default function HomePage() {
  return (
    <main className="page-wrap py-14 sm:py-16">
      <section className="surface-card grid gap-10 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
        <div className="space-y-6">
          <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-800">
            Practical car buying intelligence
          </p>
          <h1 className="heading-xl max-w-xl">Buy with wisdom.</h1>
          <p className="max-w-2xl text-base leading-relaxed text-slate-700 sm:text-lg">
            CarSage turns listing details into a Deal Confidence Score, fair-price range, and negotiation plan you can
            bring straight to the dealership.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/check" className="btn-primary">
              Check a Listing
            </Link>
            <p className="text-sm text-slate-500">Free preview first. Unlock full report for $9.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="soft-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">What buyers see before paying</h2>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
              <li>1. Fairness signal: Overpriced, Fair, or Underpriced.</li>
              <li>2. Negotiation room estimate in dollars.</li>
              <li>3. Methodology confidence and math summary.</li>
            </ol>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="soft-card p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Math model</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Age + mileage adjusted baseline</p>
            </div>
            <div className="soft-card p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Buyer output</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Offer ladder and script</p>
            </div>
            <div className="soft-card p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Pricing model</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">One-time $9 per full report</p>
            </div>
          </div>
        </div>
      </section>

      <p className="mt-8 disclaimer-text">{disclaimer}</p>
    </main>
  );
}
