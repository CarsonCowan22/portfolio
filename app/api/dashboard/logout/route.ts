import { NextRequest, NextResponse } from 'next/server';
import { DASHBOARD_COOKIE_NAME } from '@/lib/dashboardAuth';

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/dashboard/login', request.url), { status: 303 });
  response.cookies.set(DASHBOARD_COOKIE_NAME, '', { path: '/dashboard', maxAge: 0 });
  return response;
}
