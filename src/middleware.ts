import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Global Dashboard Protection
  if (url.pathname.startsWith('/dashboard')) {
    const hasSecureCookie = req.cookies.has("__Secure-next-auth.session-token") || req.cookies.has("__Secure-next-auth.session-token.0");
    const hasStandardCookie = req.cookies.has("next-auth.session-token") || req.cookies.has("next-auth.session-token.0");

    // If user has NO session cookies at all, redirect to login
    if (!hasSecureCookie && !hasStandardCookie) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', url.pathname + url.search);
      return NextResponse.redirect(loginUrl);
    }

    const isSecure = hasSecureCookie || req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
    const cookieName = hasSecureCookie ? "__Secure-next-auth.session-token" : "next-auth.session-token";

    try {
      const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET || "a_very_secret_key_for_artsfest_2026",
        cookieName,
        secureCookie: isSecure,
      });

      // If token verified, proceed
      if (token) {
        return NextResponse.next();
      }
      // If token decoding at the edge returned null but cookies exist,
      // allow request to proceed to layout.tsx so Node.js getServerSession can validate it authoritatively
    } catch (e) {
      // Proceed to server components for authoritative verification
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

