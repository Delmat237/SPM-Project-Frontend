import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  // Protect /dashboard routes
  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      // Redirect to login page if token is missing
      const loginUrl = new URL("/auth/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated users away from login/register screens to dashboard
  if (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/register")) {
    if (token) {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/login", "/auth/register"],
};
