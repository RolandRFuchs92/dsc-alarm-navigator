import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/signup", "/pending", "/api/health", "/api/auth"];

// Strict CSP with a fresh nonce per request. Next reads the nonce back from the request's
// CSP header and stamps it on its own inline scripts. Fonts are self-hosted by next/font.
// `next dev` alone also needs 'unsafe-eval' (React's dev tooling); production never gets it.
function buildCsp(nonce: string): string {
  const devEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  const result = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devEval}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  return result;
}

// Cheap gate only: no session cookie -> /login. Approval is checked by the guards.
function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  if (!isPublic && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);
  const result = NextResponse.next({ request: { headers: requestHeaders } });
  result.headers.set("content-security-policy", csp);
  return result;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };

export { proxy };
