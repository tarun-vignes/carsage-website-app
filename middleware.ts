import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookieValues: Array<{ name: string; value: string; options: CookieOptions }>) {
        response = NextResponse.next({
          request: {
            headers: request.headers
          }
        });

        cookieValues.forEach(({ name, value, options }) => {
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const isProtectedRoute = ["/dashboard", "/report"].some((path) => request.nextUrl.pathname.startsWith(path));

  if (isProtectedRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/report/:path*"]
};
