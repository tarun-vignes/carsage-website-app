import { NextResponse } from "next/server";
import { buildReport } from "@/lib/scoring";
import { createReportRecord } from "@/lib/reports";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { quoteInputSchema } from "@/lib/validation";

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

  const supabase = createSupabaseServerClient();
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

    const user = await getRequestUser(request);

    if (!user) {
      console.error("Quote auth failed", {
        hasAuthorizationHeader: Boolean(request.headers.get("authorization")),
        hasCookieHeader: Boolean(request.headers.get("cookie"))
      });
      return NextResponse.json({ error: "You must be signed in to generate a report." }, { status: 401 });
    }

    const json = await request.json();
    const parsed = quoteInputSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input.",
          issues: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    const output = buildReport(parsed.data);
    const reportId = await createReportRecord(user.id, parsed.data, output);

    return NextResponse.json({ reportId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
