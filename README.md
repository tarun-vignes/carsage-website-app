<<<<<<< Updated upstream
# CarSage MVP

CarSage is a Next.js 14 MVP that helps buyers evaluate a car listing with a Deal Confidence Score, price band, and negotiation plan.
=======
![Autovaro logo](public/autovaro-logo.png)

Autovaro is a Next.js MVP that helps car buyers evaluate a listing before purchase. A user enters vehicle details manually or pastes a dealership listing URL, then Autovaro generates a report with a Deal Confidence Score, fair-price guidance, negotiation room, and a suggested offer plan.

The product is designed around a free-preview-first flow:
- users create an account
- generate a report for a vehicle
- see a preview score and core insight
- unlock the full report for a one-time payment

## Product Overview

Autovaro is meant to answer a practical buyer question:

`Is this car priced reasonably, and what should I actually offer?`

For each report, Autovaro calculates:
- Deal Confidence Score
- price signal: `Overpriced`, `Fair`, or `Underpriced`
- fair price band
- negotiation opportunity range
- offer ladder:
  - opening offer
  - target price
  - walk-away price
- fee risk estimate by state
- optional finance estimate
- buyer-friendly negotiation script

## Current Frontend Experience

The current frontend includes:
- landing page with automotive-styled branding and positioning
- `/check` page with:
  - manual entry
  - automatic listing extraction by URL
- `/report/[id]` with:
  - preview report surface
  - locked full report state
  - premium-style metrics and offer sections
- `/dashboard` for saved reports
- `/login` and `/signup`
- accessibility controls:
  - larger text
  - higher contrast
  - reduced motion
  - relaxed line spacing
  - enhanced link visibility
  - read-aloud controls
>>>>>>> Stashed changes

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth)
- Stripe Checkout (one-time $9 report unlock)
- Zod validation

## Features

<<<<<<< Updated upstream
- Email/password auth with Supabase
- Protected report and dashboard routes
- `/check` form with required and optional purchase-method fields
- `/api/quote` input validation + deterministic scoring + report persistence
- Free preview report + paid unlock flow
- Stripe checkout + webhook to mark report as paid
- Dashboard listing report history and paid/preview status
- PDF export via browser print
=======
1. A user signs up or logs in.
2. The user checks a listing manually or by pasting a dealership URL.
3. The app validates the input with Zod.
4. Autovaro computes a pricing and negotiation report from deterministic formulas.
5. The report is stored in Supabase.
6. The user sees a preview first.
7. The user can later unlock the full report with Stripe.
>>>>>>> Stashed changes

## Folder Structure

```text
/app
  /check
  /report/[id]
  /dashboard
  /api/quote
  /api/stripe/checkout
  /api/stripe/webhook
/lib
  scoring.ts
  pricing-baseline.ts
  validation.ts
/db
  schema.ts
```

## 1) Install and Run

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

## 2) Environment Variables

Copy `.env.example` to `.env.local` and fill values:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 3) Supabase Setup

1. Create a Supabase project.
2. In Supabase SQL editor, run:

```sql
create extension if not exists "pgcrypto";

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_json jsonb not null,
  output_json jsonb not null,
  is_paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "Users can view own reports"
on public.reports
for select
using (auth.uid() = user_id);

create policy "Users can insert own reports"
on public.reports
for insert
with check (auth.uid() = user_id);

create policy "Users can update own reports"
on public.reports
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_reports_user_created
on public.reports (user_id, created_at desc);
```

3. Enable Email auth in Supabase Authentication settings.
4. Add `http://localhost:3000/auth/callback` to allowed redirect URLs.
5. Set project URL, anon key, and service role key in `.env.local`.

## 4) Stripe Test Mode Setup

1. Create a one-time product and price in Stripe test mode for **$9.00**.
2. Set `STRIPE_PRICE_ID` to that price ID.
3. Set `STRIPE_SECRET_KEY` to your Stripe test secret key.
4. Start local webhook forwarding:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

5. Copy the returned webhook signing secret into `STRIPE_WEBHOOK_SECRET`.
6. Complete checkout with a test card (e.g. `4242 4242 4242 4242`).

## API Routes

- `POST /api/quote` validates payload with Zod, computes report output, stores preview report in Supabase.
- `POST /api/stripe/checkout` creates Stripe Checkout Session for a report.
- `POST /api/stripe/webhook` verifies Stripe signature and marks `reports.is_paid = true`.

## Security Notes

- Protected page access enforced by middleware and server-side user checks.
- Ownership checks enforced for report fetch and checkout creation.
- Stripe webhook verified with signing secret.
- Service-role Supabase client is only used by webhook handler.

## Disclaimer

Autovaro provides educational pricing guidance based on aggregated market data. Estimates are not guarantees and may not reflect final out-the-door pricing.
