"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PurchaseMethod } from "@/types/report";

const disclaimer =
  "CarSage provides educational pricing guidance based on aggregated market data. Estimates are not guarantees and may not reflect final out-the-door pricing.";

type EntryMode = "manual" | "automatic";

interface QuoteFormState {
  year: string;
  make: string;
  model: string;
  vin: string;
  mileage: string;
  askingPrice: string;
  zipCode: string;
  purchaseMethod: PurchaseMethod;
  listingUrl: string;
  downPayment: string;
  loanTermMonths: string;
  aprPercent: string;
  leaseTermMonths: string;
  leaseMilesPerYear: string;
}

interface AutoExtractPayload {
  title?: string;
  source?: "jsonld" | "platform_state" | "heuristic";
  extractedCount?: number;
  parsed?: {
    year?: number;
    make?: string;
    model?: string;
    mileage?: number;
    askingPrice?: number;
    zipCode?: string;
  };
  error?: string;
}

const defaultState: QuoteFormState = {
  year: "",
  make: "",
  model: "",
  vin: "",
  mileage: "",
  askingPrice: "",
  zipCode: "",
  purchaseMethod: "cash",
  listingUrl: "",
  downPayment: "",
  loanTermMonths: "",
  aprPercent: "",
  leaseTermMonths: "",
  leaseMilesPerYear: ""
};

const REQUIRED_AUTO_FIELDS: Array<keyof NonNullable<AutoExtractPayload["parsed"]>> = [
  "year",
  "make",
  "model",
  "mileage",
  "askingPrice",
  "zipCode"
];

export default function CheckPage() {
  const router = useRouter();
  const [form, setForm] = useState<QuoteFormState>(defaultState);
  const [entryMode, setEntryMode] = useState<EntryMode>("manual");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [autoUrl, setAutoUrl] = useState("");
  const [autoError, setAutoError] = useState<string | null>(null);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  async function handleAutoGenerate() {
    setAutoError(null);

    const listingUrl = autoUrl.trim();
    if (!listingUrl) {
      setAutoError("Please paste a dealership listing URL.");
      return;
    }

    setIsAutoSubmitting(true);

    try {
      const extractResponse = await fetch("/api/listing-extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ listingUrl })
      });

      const extractPayload = (await extractResponse.json()) as AutoExtractPayload;

      if (!extractResponse.ok) {
        setAutoError(extractPayload.error ?? "Unable to extract this listing.");
        return;
      }

      const parsed = extractPayload.parsed ?? {};
      const missing = REQUIRED_AUTO_FIELDS.filter((field) => parsed[field] === undefined);

      if (missing.length > 0) {
        setAutoError(
          `Could not extract required fields (${missing.join(", " )}). Switch to Manual Entry to complete details.`
        );
        return;
      }

      const quotePayload = {
        year: parsed.year,
        make: parsed.make,
        model: parsed.model,
        mileage: parsed.mileage,
        askingPrice: parsed.askingPrice,
        zipCode: parsed.zipCode,
        purchaseMethod: "cash",
        listingUrl
      };

      const quoteResponse = await fetch("/api/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(quotePayload)
      });

      const quoteResult = await quoteResponse.json();

      if (!quoteResponse.ok) {
        if (quoteResponse.status === 401) {
          router.push("/login?next=/check");
          return;
        }

        setAutoError(quoteResult.error ?? "Could not generate report from this listing.");
        return;
      }

      router.push(`/report/${quoteResult.reportId}`);
    } catch {
      setAutoError("Network error while extracting and generating report.");
    } finally {
      setIsAutoSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const manualPayload = {
        ...form,
        listingUrl: undefined
      };

      const response = await fetch("/api/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(manualPayload)
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Unable to generate your report right now.");

        if (response.status === 401) {
          router.push("/login?next=/check");
        }

        return;
      }

      router.push(`/report/${payload.reportId}`);
    } catch {
      setError("Network error while generating report.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-wrap py-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.34fr]">
        <section className="surface-card p-6 sm:p-8">
          <p className="eyebrow">Vehicle intake</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="heading-xl">Check a Listing</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Choose manual entry or paste a dealership link. CarSage will convert the listing into a score, pricing
                range, and negotiation plan.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Preview first</p>
              <p className="mt-1 text-xs text-slate-600">See the score before deciding to unlock the full report.</p>
            </div>
          </div>

          <div className="mt-6 inline-flex rounded-xl border border-slate-300 bg-white p-1 text-sm">
            <button
              type="button"
              onClick={() => setEntryMode("manual")}
              className={`rounded-lg px-4 py-2 font-semibold ${
                entryMode === "manual" ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              Manual Entry
            </button>
            <button
              type="button"
              onClick={() => setEntryMode("automatic")}
              className={`rounded-lg px-4 py-2 font-semibold ${
                entryMode === "automatic" ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              Automatic Entry
            </button>
          </div>

          {entryMode === "automatic" ? (
            <div className="soft-card mt-5 space-y-3 p-4">
              <p className="text-sm font-semibold text-slate-800">Automatic Entry</p>
              <p className="text-xs text-slate-600">
                Paste the dealership listing URL. CarSage will extract details and generate a report directly.
              </p>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-slate-700">Listing URL</span>
                <input
                  type="url"
                  placeholder="https://dealer.com/used-vehicles/2022-toyota-camry..."
                  value={autoUrl}
                  onChange={(event) => setAutoUrl(event.target.value)}
                />
              </label>
              <button
                type="button"
                onClick={handleAutoGenerate}
                disabled={isAutoSubmitting}
                className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAutoSubmitting ? "Generating..." : "Generate From Link"}
              </button>
              {autoError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{autoError}</p>}
            </div>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700">Year</span>
                  <input
                    required
                    type="number"
                    min={1998}
                    max={currentYear + 1}
                    value={form.year}
                    onChange={(event) => setForm((prev) => ({ ...prev, year: event.target.value }))}
                  />
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700">Make</span>
                  <input required value={form.make} onChange={(event) => setForm((prev) => ({ ...prev, make: event.target.value }))} />
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700">Model</span>
                  <input required value={form.model} onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))} />
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700">VIN (optional)</span>
                  <input
                    value={form.vin}
                    maxLength={17}
                    placeholder="17-character VIN"
                    onChange={(event) => setForm((prev) => ({ ...prev, vin: event.target.value.toUpperCase() }))}
                  />
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700">Mileage</span>
                  <input
                    required
                    type="number"
                    min={0}
                    value={form.mileage}
                    onChange={(event) => setForm((prev) => ({ ...prev, mileage: event.target.value }))}
                  />
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700">Asking Price ($)</span>
                  <input
                    required
                    type="number"
                    min={1000}
                    value={form.askingPrice}
                    onChange={(event) => setForm((prev) => ({ ...prev, askingPrice: event.target.value }))}
                  />
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700">ZIP Code</span>
                  <input
                    required
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="12345"
                    maxLength={5}
                    value={form.zipCode}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, zipCode: event.target.value.replace(/\D/g, "").slice(0, 5) }))
                    }
                  />
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700">Purchase Method</span>
                  <select
                    value={form.purchaseMethod}
                    onChange={(event) => setForm((prev) => ({ ...prev, purchaseMethod: event.target.value as PurchaseMethod }))}
                  >
                    <option value="cash">Cash</option>
                    <option value="finance">Finance</option>
                    <option value="lease">Lease</option>
                  </select>
                </label>
              </div>

              {form.purchaseMethod === "finance" && (
                <div className="soft-card grid gap-4 p-4 sm:grid-cols-3">
                  <label className="space-y-1.5 text-sm">
                    <span className="font-medium text-slate-700">Down Payment ($)</span>
                    <input
                      type="number"
                      min={0}
                      value={form.downPayment}
                      onChange={(event) => setForm((prev) => ({ ...prev, downPayment: event.target.value }))}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm">
                    <span className="font-medium text-slate-700">Loan Term (months)</span>
                    <input
                      required
                      type="number"
                      min={12}
                      max={96}
                      value={form.loanTermMonths}
                      onChange={(event) => setForm((prev) => ({ ...prev, loanTermMonths: event.target.value }))}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm">
                    <span className="font-medium text-slate-700">APR (%)</span>
                    <input
                      required
                      type="number"
                      min={0}
                      max={30}
                      step="0.1"
                      value={form.aprPercent}
                      onChange={(event) => setForm((prev) => ({ ...prev, aprPercent: event.target.value }))}
                    />
                  </label>
                </div>
              )}

              {form.purchaseMethod === "lease" && (
                <div className="soft-card grid gap-4 p-4 sm:grid-cols-2">
                  <label className="space-y-1.5 text-sm">
                    <span className="font-medium text-slate-700">Lease Term (months)</span>
                    <input
                      required
                      type="number"
                      min={12}
                      max={60}
                      value={form.leaseTermMonths}
                      onChange={(event) => setForm((prev) => ({ ...prev, leaseTermMonths: event.target.value }))}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm">
                    <span className="font-medium text-slate-700">Miles per Year</span>
                    <input
                      required
                      type="number"
                      min={5000}
                      max={25000}
                      value={form.leaseMilesPerYear}
                      onChange={(event) => setForm((prev) => ({ ...prev, leaseMilesPerYear: event.target.value }))}
                    />
                  </label>
                </div>
              )}

              {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Generating..." : "Generate Report"}
              </button>
            </form>
          )}
        </section>

        <aside className="space-y-4">
          <div className="surface-card p-5">
            <p className="eyebrow">What buyers get</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">A cleaner number before you negotiate</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The goal is not to predict the exact sale price. The goal is to give you a reasonable band, an opening number,
              and a point where you should walk.
            </p>
          </div>

          <div className="soft-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Entry options</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>
                <span className="font-semibold">Manual Entry:</span> You type vehicle details directly.
              </li>
              <li>
                <span className="font-semibold">Automatic Entry:</span> Paste a dealership URL and generate from extracted data.
              </li>
            </ul>
          </div>

          <div className="soft-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">How the math works</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>Base value from exact model or closest market segment.</li>
              <li>Age adjustment by model-year depreciation curve.</li>
              <li>Mileage adjustment versus expected annual use.</li>
              <li>State fee risk folded into total confidence score.</li>
            </ul>
          </div>
          <div className="soft-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Free preview includes</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>Deal Confidence Score and price signal</li>
              <li>Estimated negotiation room range</li>
              <li>Methodology confidence and baseline type</li>
            </ul>
          </div>

          <div className="soft-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Best use at the dealership</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>Negotiate selling price before monthly payment.</li>
              <li>Use the walk-away number to avoid payment padding.</li>
              <li>Ask for fees in writing before signing anything.</li>
            </ul>
          </div>
        </aside>
      </div>

      <p className="mt-6 disclaimer-text">{disclaimer}</p>
    </main>
  );
}
