
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

declare global {
  // eslint-disable-next-line no-var
  var __molotovTokenStore: Record<string, number>;
}
const tokenStore: Record<string, number> = globalThis.__molotovTokenStore || (globalThis.__molotovTokenStore = {});
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const auth = request.cookies.get("auth_user");

  function isValidAuthCookie(val: string | undefined): boolean {
        if (typeof val !== 'string' || !/^[a-f0-9]{32}$/i.test(val)) return false;
        const expires = tokenStore[val];
        if (!expires) return false;
        if (Date.now() > expires) {
            delete tokenStore[val];
            return false;
        }
        return true;
  }

  if (pathname.startsWith("/api/") && pathname !== "/api/login") {
    if (!auth || !isValidAuthCookie(auth.value)) {
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
