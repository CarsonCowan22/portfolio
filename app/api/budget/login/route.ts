import { NextRequest, NextResponse } from 'next/server';
import {
  BUDGET_COOKIE_MAX_AGE,
  BUDGET_COOKIE_NAME,
  createAuthToken,
  timingSafeStringEqual,
} from '@/lib/budgetAuth';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = formData.get('password');
  const nextParam = formData.get('next');
  const next =
    typeof nextParam === 'string' && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : '/budget';

  const expected = process.env.BUDGET_DASHBOARD_PASSWORD;
  const secret = process.env.BUDGET_COOKIE_SECRET;
  const passwordOk =
    typeof password === 'string' && !!expected && timingSafeStringEqual(password, expected);

  if (!passwordOk || !secret) {
    const url = new URL('/budget/login', request.url);
    url.searchParams.set('error', '1');
    url.searchParams.set('next', next);
    return NextResponse.redirect(url, { status: 303 });
  }

  const token = await createAuthToken(secret);
  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });
  response.cookies.set(BUDGET_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: BUDGET_COOKIE_MAX_AGE,
  });
  return response;
}
