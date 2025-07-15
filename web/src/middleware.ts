
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const auth = request.cookies.get("auth_user");

  if (pathname.startsWith("/api/") && pathname !== "/api/login") {
    if (!auth) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return NextResponse.next();
  }

  const isPublic = pathname === "/login" || pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname.startsWith("/static/") || pathname.startsWith("/favicon.ico");
  if (!auth && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|static|favicon.ico).*)"],
};
