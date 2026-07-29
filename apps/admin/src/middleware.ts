import { NextRequest, NextResponse } from 'next/server';

const apiUrl =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export async function middleware(request: NextRequest) {
  const cookie = request.headers.get('cookie');

  if (!cookie) {
    return redirectToLogin(request);
  }

  try {
    const response = await fetch(`${apiUrl}/auth/admin-check`, {
      headers: {
        cookie,
        'x-hanbotorder-session-scope': 'admin'
      },
      cache: 'no-store'
    });

    if (response.ok) {
      return NextResponse.next();
    }
  } catch {
    // Fail closed when the API cannot verify the admin session.
  }

  return redirectToLogin(request);
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!api|login|_next/static|_next/image|favicon.ico).*)']
};
