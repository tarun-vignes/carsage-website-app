import { createServerClient, type CookieOptions } from "@supabase/ssr";

function parseCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) {
    return [];
  }

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex === -1) {
        return { name: part, value: "" };
      }

      return {
        name: part.slice(0, separatorIndex),
        value: decodeURIComponent(part.slice(separatorIndex + 1))
      };
    });
}

export function createSupabaseRouteClient(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  const cookieValues = parseCookieHeader(request.headers.get("cookie"));

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieValues;
      },
      setAll(_cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        // Route handlers do not need to persist cookie mutations for this read-only auth check.
      }
    }
  });
}
