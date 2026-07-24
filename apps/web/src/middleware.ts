import { NextRequest, NextResponse } from 'next/server';

const apiUrl =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export async function middleware(request: NextRequest) {
  const cookie = request.headers.get('cookie');

  if (cookie) {
    try {
      const response = await fetch(`${apiUrl}/auth/me`, {
        headers: { cookie },
        cache: 'no-store'
      });

      if (response.ok) {
        return NextResponse.next();
      }
    } catch {
      // Fail closed when the API cannot verify the customer session.
    }
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/account/:path*', '/checkout/:path*', '/yeu-cau-in']
};
