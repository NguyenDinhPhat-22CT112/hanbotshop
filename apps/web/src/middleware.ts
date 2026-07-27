import { NextRequest, NextResponse } from 'next/server';

const apiUrl =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const customerSessionCookieName = 'hanbotorder_session';

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get(customerSessionCookieName);

  if (!sessionCookie?.value) {
    return redirectToLogin(request);
  }

  try {
    const response = await fetch(`${apiUrl}/auth/me`, {
      headers: {
        cookie: `${customerSessionCookieName}=${encodeURIComponent(sessionCookie.value)}`
      },
      cache: 'no-store'
    });

    if (response.status === 401 || response.status === 403) {
      return redirectToLogin(request);
    }
  } catch {
    // Keep the page shell available during a temporary API outage. Every
    // protected API request still verifies the cookie independently.
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/account/:path*', '/checkout/:path*', '/yeu-cau-in']
};
