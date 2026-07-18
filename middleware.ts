import { NextRequest, NextResponse } from 'next/server';
import { DASHBOARD_COOKIE_NAME, verifyAuthToken as verifyDashboardToken } from '@/lib/dashboardAuth';
import { BUDGET_COOKIE_NAME, verifyAuthToken as verifyBudgetToken } from '@/lib/budgetAuth';

// Matches every path except /api/*, Next internals, and favicon.ico. A broad catch-all (rather
// than separate '/dashboard/:path*' and '/budget/:path*' entries) is required so the budget
// subdomain rewrite below can catch clean paths like "/", "/review", "/rules" that don't start
// with "/budget" in the browser's address bar.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') ?? '';
  const isBudgetHost = host.startsWith('budget.');

  if (pathname.startsWith('/dashboard')) {
    return handleDashboard(request, pathname);
  }

  if (isBudgetHost || pathname.startsWith('/budget')) {
    return handleBudget(request, pathname, isBudgetHost);
  }

  return NextResponse.next();
}

async function handleDashboard(request: NextRequest, pathname: string) {
  if (pathname.startsWith('/dashboard/login')) {
    return NextResponse.next();
  }

  const secret = process.env.JOB_HUNT_COOKIE_SECRET;
  const token = request.cookies.get(DASHBOARD_COOKIE_NAME)?.value;

  if (!secret || !(await verifyDashboardToken(token, secret))) {
    const loginUrl = new URL('/dashboard/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * On the budget subdomain the browser sees clean paths ("/", "/login", "/review", ...); these
 * map internally to "/budget", "/budget/login", "/budget/review". On the main domain, "/budget/*"
 * paths work directly (useful for local dev without configuring a second hostname). A "/budget"
 * prefix is also accepted on the subdomain (and stripped) so app-internal links -- which are
 * written as "/budget/review" so they work on the main domain too -- don't double-prefix.
 */
async function handleBudget(request: NextRequest, pathname: string, isBudgetHost: boolean) {
  const cleanPath = isBudgetHost
    ? pathname === '/'
      ? ''
      : pathname.startsWith('/budget')
        ? pathname.slice('/budget'.length)
        : pathname
    : pathname.slice('/budget'.length);
  const internalPath = `/budget${cleanPath}`;
  const isLoginRoute = cleanPath === '/login';

  if (isLoginRoute) {
    return isBudgetHost ? rewrite(request, internalPath) : NextResponse.next();
  }

  const secret = process.env.BUDGET_COOKIE_SECRET;
  const token = request.cookies.get(BUDGET_COOKIE_NAME)?.value;

  if (!secret || !(await verifyBudgetToken(token, secret))) {
    const loginPath = isBudgetHost ? '/login' : '/budget/login';
    const loginUrl = new URL(loginPath, request.url);
    loginUrl.searchParams.set('next', isBudgetHost ? cleanPath || '/' : pathname);
    return NextResponse.redirect(loginUrl);
  }

  return isBudgetHost ? rewrite(request, internalPath) : NextResponse.next();
}

function rewrite(request: NextRequest, internalPath: string) {
  const url = request.nextUrl.clone();
  url.pathname = internalPath;
  return NextResponse.rewrite(url);
}
