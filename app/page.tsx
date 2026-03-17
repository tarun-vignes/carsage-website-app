import Link from "next/link";

const disclaimer =
  "Autovaro provides educational pricing guidance based on aggregated market data. Estimates are not guarantees and may not reflect final out-the-door pricing.";

export default function HomePage() {
  return (
    <main className="page-wrap py-14 sm:py-16">
      <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="surface-card overflow-hidden p-7 sm:p-10">
          <div className="space-y-6">
            <p className="brand-chip">Practical negotiation intelligence for real buyers</p>
            <div className="space-y-4">
              <h1 className="heading-xl max-w-3xl">Walk into the dealership with numbers you can defend.</h1>
              <p className="max-w-2xl text-base leading-relaxed text-slate-700 sm:text-lg">
                Autovaro turns listing details into a deal confidence score, a fair-price band, and a negotiation path that
                keeps you anchored before financing, fees, or sales pressure distort the conversation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/check" className="btn-primary">
                Check a Listing
              </Link>
              <p className="text-sm text-slate-500">Free preview first. Unlock the full report for $9 when the car is worth pursuing.</p>
            </div>
          </div>
        </div>

        <div className="showcase-panel">
          <div className="grid gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">What buyers get</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">A cleaner pricing position</h2>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-right shadow-[0_18px_30px_-28px_rgba(15,23,42,0.45)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Unlock model</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">$9/report</p>
              </div>
            </div>

            <div className="hero-panel">
              <ol className="space-y-4 text-sm leading-relaxed text-slate-700">
                <li>
                  <span className="font-semibold text-slate-900">1. Deal signal</span>
                  <p className="mt-1">See whether the listing looks overpriced, fair, or underpriced before you engage.</p>
                </li>
                <li>
                  <span className="font-semibold text-slate-900">2. Negotiation room</span>
                  <p className="mt-1">Get a realistic offer ladder with an opening number, target, and walk-away point.</p>
                </li>
                <li>
                  <span className="font-semibold text-slate-900">3. Buying script</span>
                  <p className="mt-1">Use the report to keep the conversation on selling price instead of monthly payment distractions.</p>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip mt-6">
        <div className="soft-card p-5">
          <p className="eyebrow">Pricing engine</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">Age plus mileage baseline</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">The score starts from a structured market baseline and adjusts from there.</p>
        </div>
        <div className="soft-card p-5">
          <p className="eyebrow">Buyer output</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">Offer ladder and fee risk</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">You get useful buying guidance, not just a number with no negotiation context.</p>
        </div>
        <div className="soft-card p-5">
          <p className="eyebrow">Best use case</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">Before you visit the lot</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Run the report before the test drive so the dealership is reacting to your frame, not the reverse.</p>
        </div>
      </section>

      <section className="surface-card mt-6 p-6 sm:p-8">
        <div className="grid gap-5 lg:grid-cols-3">
          <div>
            <p className="eyebrow">How it works</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Fast enough for active shopping</h2>
          </div>
          <div className="hero-panel">
            <p className="text-sm font-semibold text-slate-900">Paste a dealership listing or enter the car manually.</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Autovaro is built for the listings buyers actually compare while shopping online.</p>
          </div>
          <div className="hero-panel">
            <p className="text-sm font-semibold text-slate-900">Preview first, then unlock the deeper negotiation pack.</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">You only pay when the listing is serious enough to justify a dealership-ready plan.</p>
          </div>
        </div>
      </section>

      <p className="mt-8 disclaimer-text">{disclaimer}</p>
    </main>
  );
}
