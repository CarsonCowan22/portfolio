import { NextRequest, NextResponse } from 'next/server';
import {
  createAuthToken,
  DASHBOARD_COOKIE_MAX_AGE,
  DASHBOARD_COOKIE_NAME,
  timingSafeStringEqual,
} from '@/lib/dashboardAuth';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = formData.get('password');
  const nextParam = formData.get('next');
  const next = typeof nextParam === 'string' && nextParam.startsWith('/dashboard') ? nextParam : '/dashboard/job-hunt';

  const expected = process.env.JOB_HUNT_DASHBOARD_PASSWORD;
  const secret = process.env.JOB_HUNT_COOKIE_SECRET;
  const passwordOk =
    typeof password === 'string' && !!expected && timingSafeStringEqual(password, expected);

  if (!passwordOk || !secret) {
    const url = new URL('/dashboard/login', request.url);
    url.searchParams.set('error', '1');
    url.searchParams.set('next', next);
    return NextResponse.redirect(url, { status: 303 });
  }

  const token = await createAuthToken(secret);
  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });
  response.cookies.set(DASHBOARD_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/dashboard',
    maxAge: DASHBOARD_COOKIE_MAX_AGE,
  });
  return response;
}
