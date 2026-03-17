import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookieValues: Array<{ name: string; value: string; options: CookieOptions }>) {
        try {
          cookieValues.forEach(({ name, value, options }) => {
            cookieStore.set({ name, value, ...options });
          });
        } catch {
          // Cookie mutations are not always available in server components.
        }
      }
    }
  });
}
