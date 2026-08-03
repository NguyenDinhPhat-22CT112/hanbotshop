import { NextRequest, NextResponse } from 'next/server';

const apiUrl =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const customerSessionCookieName = 'hanbotorder_session';
const adminSessionCookieName = 'hanbotorder_admin_session';

export async function middleware(request: NextRequest) {
  // Check for either customer or admin session cookie
  const customerCookie = request.cookies.get(customerSessionCookieName);
  const adminCookie = request.cookies.get(adminSessionCookieName);

  // Allow access if either cookie exists
  if (!customerCookie?.value && !adminCookie?.value) {
    return redirectToLogin(request);
  }

  try {
    // Build cookie header with both cookies if available
    const cookieParts: string[] = [];
    if (customerCookie?.value) {
      cookieParts.push(`${customerSessionCookieName}=${encodeURIComponent(customerCookie.value)}`);
    }
    if (adminCookie?.value) {
      cookieParts.push(`${adminSessionCookieName}=${encodeURIComponent(adminCookie.value)}`);
    }

    const response = await fetch(`${apiUrl}/auth/me`, {
      headers: {
        cookie: cookieParts.join('; '),
        // If admin cookie exists, set scope header to prioritize admin session
        ...(adminCookie?.value ? { 'x-hanbotorder-session-scope': 'admin' } : {})
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
