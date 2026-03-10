import { notFound, redirect } from "next/navigation";
import { getReportForUser } from "@/lib/reports";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { UnlockReportButton } from "@/components/unlock-report-button";
import { PdfExportButton } from "@/components/pdf-export-button";
import type { PriceIndicator } from "@/types/report";

const disclaimer =
  "CarSage provides educational pricing guidance based on aggregated market data. Estimates are not guarantees and may not reflect final out-the-door pricing.";

const isSupabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function currency(value: number): string {
  return `$${value.toLocaleString()}`;
}

function signedCurrency(value: number): string {
  if (value > 0) {
    return `+${currency(value)}`;
  }

  if (value < 0) {
    return `-${currency(Math.abs(value))}`;
  }

  return "$0";
}

function scoreTone(score: number): string {
  if (score >= 75) {
    return "text-emerald-600";
  }

  if (score >= 55) {
    return "text-blue-700";
  }

  return "text-amber-600";
}

function indicatorTone(indicator: PriceIndicator): string {
  if (indicator === "Underpriced") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (indicator === "Fair") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default async function ReportPage({ params }: { params: { id: string } }) {
  if (!isSupabaseConfigured) {
    return (
      <main className="page-wrap py-10">
        <div className="surface-card p-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Supabase not configured</h1>
          <p className="mt-2 text-sm text-slate-600">Set Supabase environment variables to load reports.</p>
        </div>
      </main>
    );
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/report/${params.id}`);
  }

  const report = await getReportForUser(params.id, user.id);
  if (!report) {
    notFound();
  }

  const input = report.input_json;
  const output = report.output_json;
  const scoreWidth = `${Math.max(8, Math.min(output.dealConfidenceScore, 100))}%`;
  const priceDelta = input.askingPrice - output.fairPriceBand.mid;

  return (
    <main className="page-wrap py-10">
      <div className="print-page space-y-6">
        <section className="surface-card overflow-hidden p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="eyebrow">CarSage report</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  {input.year} {input.make} {input.model}
                </h1>
                <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${indicatorTone(output.priceIndicator)}`}>
                  {output.priceIndicator}
                </span>
              </div>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">{output.topInsight}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                  Asking {currency(input.askingPrice)}
                </span>
                <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                  {input.mileage.toLocaleString()} miles
                </span>
                <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                  {input.purchaseMethod} purchase
                </span>
                <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                  ZIP {input.zipCode}
                </span>
                {input.vin && (
                  <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                    VIN {input.vin}
                  </span>
                )}
              </div>
            </div>

            <div className="metric-card flex flex-col justify-between bg-[linear-gradient(145deg,rgba(239,246,255,0.95),rgba(255,255,255,0.95))]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="metric-label">Deal confidence score</p>
                  <p className={`mt-2 text-5xl font-semibold tracking-tight ${scoreTone(output.dealConfidenceScore)}`}>
                    {output.dealConfidenceScore}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Generated</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">{new Date(report.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="mt-5">
                <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#1d4ed8_0%,#2563eb_55%,#60a5fa_100%)]"
                    style={{ width: scoreWidth }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>Needs caution</span>
                  <span>Balanced</span>
                  <span>Strong deal</span>
                </div>
              </div>

              <div className="print-hidden mt-6 flex flex-wrap items-center gap-3">
                {report.is_paid ? <PdfExportButton /> : <UnlockReportButton reportId={report.id} />}
                {!report.is_paid && <p className="text-xs text-slate-500">Free preview live. Full negotiation pack unlocks for $9.</p>}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="metric-card">
            <p className="metric-label">Fair market mid</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{currency(output.fairPriceBand.mid)}</p>
            <p className="mt-2 text-sm text-slate-600">Modeled midpoint before tax and registration.</p>
          </div>

          <div className="metric-card">
            <p className="metric-label">Negotiation room</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              {currency(output.negotiationOpportunity.low)} - {currency(output.negotiationOpportunity.high)}
            </p>
            <p className="mt-2 text-sm text-slate-600">{output.negotiationOpportunity.note}</p>
          </div>

          <div className="metric-card">
            <p className="metric-label">Price gap vs mid</p>
            <p className={`mt-3 text-3xl font-semibold tracking-tight ${priceDelta <= 0 ? "text-emerald-600" : "text-amber-600"}`}>
              {signedCurrency(priceDelta)}
            </p>
            <p className="mt-2 text-sm text-slate-600">Difference between asking price and modeled fair-value midpoint.</p>
          </div>

          <div className="metric-card">
            <p className="metric-label">Model confidence</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              {output.methodologyPreview.confidenceLabel}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {output.methodologyPreview.matchLevel} match using {output.methodologyPreview.vehicleSegment}.
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="surface-card p-6">
            <p className="eyebrow">Preview takeaway</p>
            <h2 className="mt-2 section-heading">What you can already tell before paying</h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">{output.topInsight}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="metric-label">Baseline used</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{output.methodologyPreview.baselineReference}</p>
                <p className="mt-1 text-sm text-slate-600">{output.methodologyPreview.matchLevel}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="metric-label">Expected mileage</p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {output.methodologyPreview.expectedMileage.toLocaleString()} miles
                </p>
                <p className="mt-1 text-sm text-slate-600">Compared against age-adjusted market usage.</p>
              </div>
            </div>
          </div>

          <div className="surface-card p-6">
            <p className="eyebrow">Why the score landed here</p>
            <h2 className="mt-2 section-heading">Buyer-facing rationale</h2>
            <div className="mt-5 space-y-3">
              {output.whyBullets.map((bullet, index) => (
                <div key={bullet} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-6 text-slate-700">{bullet}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="surface-card relative overflow-hidden p-6 sm:p-8">
          {!report.is_paid && (
            <div className="locked-panel print-hidden">
              <div className="max-w-md rounded-[28px] border border-slate-200 bg-white/90 p-6 text-center shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)]">
                <p className="eyebrow">Full report locked</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Unlock your offer plan</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  See the fair-price band, exact offer ladder, fee risk detail, finance math, and a dealership-ready script.
                </p>
                <div className="mt-5 grid gap-2 text-left text-sm text-slate-700 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">Fair price band</div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">Negotiation script</div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">Fee risk panel</div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">Finance estimate</div>
                </div>
                <div className="mt-6 flex justify-center">
                  <UnlockReportButton reportId={report.id} />
                </div>
              </div>
            </div>
          )}

          <div className={report.is_paid ? "" : "select-none blur-[3px]"}>
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="eyebrow">Deal structure</p>
                <h2 className="mt-2 section-heading">Price and offer framework</h2>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="metric-card p-4">
                    <p className="metric-label">Low</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{currency(output.fairPriceBand.low)}</p>
                  </div>
                  <div className="metric-card p-4">
                    <p className="metric-label">Mid</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{currency(output.fairPriceBand.mid)}</p>
                  </div>
                  <div className="metric-card p-4">
                    <p className="metric-label">High</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{currency(output.fairPriceBand.high)}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-[28px] border border-slate-300 bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_100%)] p-5">
                    <p className="metric-label">Opening offer</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{currency(output.offerLadder.openingOffer)}</p>
                    <p className="mt-2 text-sm text-slate-600">Start here to leave room without losing credibility.</p>
                  </div>
                  <div className="rounded-[28px] border border-slate-300 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-5">
                    <p className="metric-label">Target price</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{currency(output.offerLadder.targetPrice)}</p>
                    <p className="mt-2 text-sm text-slate-600">This is the number to anchor as your realistic close.</p>
                  </div>
                  <div className="rounded-[28px] border border-slate-300 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_100%)] p-5">
                    <p className="metric-label">Walk-away</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{currency(output.offerLadder.walkAwayPrice)}</p>
                    <p className="mt-2 text-sm text-slate-600">If the total rises above this, keep shopping.</p>
                  </div>
                </div>

                <div className="mt-6 rounded-[28px] border border-slate-300 bg-slate-50 p-5">
                  <p className="metric-label">Negotiation script</p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{output.negotiationScript}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border border-slate-300 bg-white p-5 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.35)]">
                  <p className="metric-label">Fee risk panel</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">State</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{output.feeRiskPanel.state}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Estimated doc fee</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{currency(output.feeRiskPanel.docFeeEstimate)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Risk level</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{output.feeRiskPanel.riskLevel}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-300 bg-white p-5 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.35)]">
                  <p className="metric-label">Pricing model details</p>
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                      <span>Segment</span>
                      <span className="font-semibold text-slate-900">{output.methodologyPreview.vehicleSegment}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                      <span>Baseline type</span>
                      <span className="font-semibold text-slate-900">{output.methodologyPreview.matchLevel}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                      <span>Age adjustment</span>
                      <span className="font-semibold text-slate-900">{signedCurrency(output.methodologyPreview.ageAdjustment)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                      <span>Mileage adjustment</span>
                      <span className="font-semibold text-slate-900">{signedCurrency(output.methodologyPreview.mileageAdjustment)}</span>
                    </div>
                  </div>
                </div>

                {output.financeEstimate && (
                  <div className="rounded-[28px] border border-slate-300 bg-white p-5 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.35)]">
                    <p className="metric-label">Finance monthly estimate</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Principal</p>
                        <p className="mt-2 text-xl font-semibold text-slate-900">{currency(output.financeEstimate.principal)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">APR</p>
                        <p className="mt-2 text-xl font-semibold text-slate-900">{output.financeEstimate.aprPercent}%</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Term</p>
                        <p className="mt-2 text-xl font-semibold text-slate-900">{output.financeEstimate.termMonths} months</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Monthly payment</p>
                        <p className="mt-2 text-xl font-semibold text-slate-900">
                          {currency(output.financeEstimate.monthlyPayment)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-4xl">{disclaimer}</p>
          <p className="font-semibold uppercase tracking-[0.18em]">{output.watermark}</p>
        </div>
      </div>
    </main>
  );
}
