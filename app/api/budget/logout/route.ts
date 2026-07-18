import { NextRequest, NextResponse } from 'next/server';
import { BUDGET_COOKIE_NAME } from '@/lib/budgetAuth';

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/budget/login', request.url), { status: 303 });
  response.cookies.set(BUDGET_COOKIE_NAME, '', { path: '/', maxAge: 0 });
  return response;
}
