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
  const hostname = req.headers.get('host') || 'localhost:3000';
  const searchParams = req.nextUrl.searchParams.toString();
  const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ''}`;

  // Global Dashboard Protection
  if (url.pathname.startsWith('/dashboard')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET || "default_secret_if_not_set" });
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
  const isVercel = hostname.endsWith('.vercel.app');

  if (!isLocalhost && !isVercel) {
    return NextResponse.rewrite(new URL(`/_domain/${hostname}${path}`, req.url));
  }

  return NextResponse.next();
}
