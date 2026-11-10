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
// Runs on every page (not static files or images) so an expired login is
// refreshed once, here, and the new cookie is saved before anything renders.
// Server components can't save cookies: if they each refreshed on their own
// they would race for the same one-time refresh token, so the header and
// the page could disagree about who is signed in, and the next visit would
// be signed out.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm|woff2?)$).*)",
  ],
};
