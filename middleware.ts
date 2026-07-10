import { NextRequest, NextResponse } from 'next/server';
import { DASHBOARD_COOKIE_NAME, verifyAuthToken } from '@/lib/dashboardAuth';

export const config = {
  matcher: ['/dashboard/:path*'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/dashboard/login')) {
    return NextResponse.next();
  }

  const secret = process.env.JOB_HUNT_COOKIE_SECRET;
  const token = request.cookies.get(DASHBOARD_COOKIE_NAME)?.value;

  if (!secret || !(await verifyAuthToken(token, secret))) {
    const loginUrl = new URL('/dashboard/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
