import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/signup", "/pending", "/api/health", "/api/auth"];

// Cheap gate only: no session cookie -> /login. Approval is checked by the guards.
function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  if (isPublic || getSessionCookie(request)) return NextResponse.next();
  const result = NextResponse.redirect(new URL("/login", request.url));
  return result;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };

export { proxy };
