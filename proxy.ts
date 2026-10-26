import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
// Old club dashboard URLs now live on the public club home, which needs no
// login, so forward them before the auth check below.
const LEGACY_CLUB_PATH =
  /^\/dashboard\/clubs\/([^/]+)(?:\/(members|events))?\/?$/;
const LEGACY_CLUB_TAB: Record<string, string> = {
  members: "/members",
  events: "/schedule",
};

export async function proxy(request: NextRequest) {
  const legacy = request.nextUrl.pathname.match(LEGACY_CLUB_PATH);
  if (legacy) {
    const url = request.nextUrl.clone();
    url.pathname = `/clubs/${legacy[1]}${legacy[2] ? LEGACY_CLUB_TAB[legacy[2]] : ""}`;
    return NextResponse.redirect(url);
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (request.nextUrl.pathname.startsWith("/dashboard") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return response;
}
export const config = { matcher: ["/dashboard/:path*", "/admin/:path*"] };
