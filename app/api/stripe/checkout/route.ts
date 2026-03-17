import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseRouteClient } from "@/lib/supabase-route";
import { checkoutSchema } from "@/lib/validation";

export const runtime = "nodejs";

const isSupabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function getRequestUser(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (token) {
    const supabase = createSupabaseAdminClient();
    const {
      data: { user }
    } = await supabase.auth.getUser(token);

    if (user) {
      return user;
    }
  }

  const supabase = createSupabaseRouteClient(request);
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
}

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    const supabase = createSupabaseAdminClient();
    const user = await getRequestUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { data: report, error } = await supabase
      .from("reports")
      .select("id,is_paid,user_id")
      .eq("id", parsed.data.reportId)
      .eq("user_id", user.id)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    if (report.is_paid) {
      return NextResponse.json({ error: "Report already unlocked." }, { status: 409 });
    }

    const stripePriceId = process.env.STRIPE_PRICE_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!stripePriceId || !appUrl) {
      return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${appUrl}/report/${report.id}?paid=1`,
      cancel_url: `${appUrl}/report/${report.id}?canceled=1`,
      customer_email: user.email,
      metadata: {
        reportId: report.id,
        userId: user.id
      }
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe checkout URL was not returned." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
