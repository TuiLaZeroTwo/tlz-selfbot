import appConfig from '../config';
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const expectedSecret = appConfig.secretkey;
  const secretCookie = request.cookies.getAll().find(c => c.value === expectedSecret);

  if (pathname.startsWith("/api/") && pathname !== "/api/login") {
    if (!secretCookie) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return NextResponse.next();
  }

  const isPublic = pathname === "/login" || pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname.startsWith("/static/") || pathname.startsWith("/favicon.ico");
  if (!secretCookie && !isPublic) {
    if (pathname !== "/login") {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|static|favicon.ico).*)"],
};
