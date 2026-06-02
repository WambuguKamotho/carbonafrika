import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Tokens live in localStorage (not cookies), so this guards direct URL access
  // before any client JS runs. Real auth enforcement is on the backend JWT checks.
  const token = request.cookies.get("ca_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/projects/new", "/admin/:path*"],
};
