import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const rawToken = request.cookies.get('accessToken')?.value;
  const token = rawToken?.trim();
  const hasValidToken = Boolean(token && token.length > 20);
  const isLoginPage = request.nextUrl.pathname === '/login';

  // If user is intentionally on /login or session expired, delete cookie and allow login
  if (isLoginPage && (request.nextUrl.searchParams.has('expired') || request.nextUrl.searchParams.has('logout'))) {
    const response = NextResponse.next();
    response.cookies.delete('accessToken');
    response.cookies.delete('tokenExpiry');
    return response;
  }

  if (!hasValidToken && !isLoginPage) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('accessToken');
    response.cookies.delete('tokenExpiry');
    return response;
  }

  if (hasValidToken && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sounds|icons|images|manifest).*)'],
};
