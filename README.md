# CarSage

CarSage is a Next.js MVP that helps car buyers evaluate a listing before purchase. A user enters vehicle details manually or pastes a dealership listing URL, then CarSage generates a report with a Deal Confidence Score, fair-price guidance, negotiation room, and a suggested offer plan.

The product is designed around a free-preview-first flow:
- users create an account
- generate a report for a vehicle
- see a preview score and core insight
- unlock the full report for a one-time payment

## Product Overview

CarSage is meant to answer a practical buyer question:

`Is this car priced reasonably, and what should I actually offer?`

For each report, CarSage calculates:
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

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase
  - Postgres
  - Auth
- Stripe Checkout
- Zod

## Core App Flow

1. A user signs up or logs in.
2. The user checks a listing manually or by pasting a dealership URL.
3. The app validates the input with Zod.
4. CarSage computes a pricing and negotiation report from deterministic formulas.
5. The report is stored in Supabase.
6. The user sees a preview first.
7. The user can later unlock the full report with Stripe.

## Report Logic

The current scoring model is deterministic and explainable. It is based on:
- baseline vehicle pricing data
- age adjustment
- mileage adjustment
- fee-risk estimate from ZIP/state
- negotiation leverage
- confidence weighting from baseline match quality

Outputs are stored as structured JSON so the report format can grow without redesigning the database immediately.

## Project Structure

```text
/app
  /check
  /dashboard
  /login
  /signup
  /report/[id]
  /api/quote
  /api/listing-extract
  /api/stripe/checkout
  /api/stripe/webhook
  /auth/callback
/components
  accessibility-controls.tsx
  pdf-export-button.tsx
  unlock-report-button.tsx
/db
  schema.ts
/lib
  pricing-baseline.ts
  reports.ts
  scoring.ts
  stripe.ts
  supabase-admin.ts
  supabase-browser.ts
  supabase-server.ts
  validation.ts
```

## Local Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Local URL:

```text
http://localhost:3000
```

## Environment Variables

Create `.env.local` from `.env.example` and fill in the values you need.

Required now:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Stripe can stay blank until payment work is activated:

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
```

## Supabase Setup

1. Create a Supabase project.
2. In Supabase `Project Settings -> API`, copy:
   - `Project URL`
   - `anon public`
   - `service_role secret`
3. Put those values into `.env.local`.
4. In Supabase `SQL Editor`, run:

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

drop policy if exists "Users can view own reports" on public.reports;
drop policy if exists "Users can insert own reports" on public.reports;
drop policy if exists "Users can update own reports" on public.reports;

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

5. In Supabase `Authentication -> Sign In / Providers`:
   - enable `Allow new users to sign up`
   - keep `Email` enabled
   - for development, keep `Confirm email` off
6. In Supabase `Authentication -> URL Configuration`:
   - set `Site URL` to your deployed app URL
   - add:
     - `http://localhost:3000/auth/callback`
     - your production `/auth/callback` URL

## Netlify Deployment

The project is currently deployable on Netlify with Next.js runtime support.

Add these environment variables in Netlify:

Public:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

Secret:
- `SUPABASE_SERVICE_ROLE_KEY`
- Stripe secrets later

Important:
- do not mark `NEXT_PUBLIC_*` variables as secret in Netlify
- only server-only credentials should be stored as secret values

## Stripe Setup

Stripe is included in the project structure but can remain unconfigured until auth and report persistence are stable.

Later setup:
1. Create a one-time Stripe product for `$9`
2. fill:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_ID`
3. test checkout
4. verify webhook marks reports as paid

## Accessibility

The frontend includes an accessibility utility panel with:
- text scaling
- contrast mode
- motion reduction
- line spacing controls
- stronger link visibility
- browser-native read-aloud support

Browser translation tools should still work because the UI stays text-based and semantic rather than canvas-based or image-based.

## Status

Current state:
- frontend is substantially built
- Netlify deployment is working
- Supabase integration is in progress
- Stripe is scaffolded but not yet final
- auth flow still requires end-to-end verification across local and deployed environments

## Disclaimer

CarSage provides educational pricing guidance based on aggregated market data. Estimates are not guarantees and may not reflect final out-the-door pricing.
