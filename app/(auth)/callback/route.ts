import { NextResponse } from "next/server";
export function GET(request: Request) {
  return NextResponse.redirect(
    new URL("/auth/callback" + new URL(request.url).search, request.url),
  );
}
