/**
 * Signed-cookie auth for the private /budget routes. A separate cookie/secret from the job-hunt
 * dashboard's -- entering one shouldn't grant access to the other. Reuses the generic HMAC
 * sign/verify helpers from dashboardAuth.ts (they already take the secret as a parameter).
 */

export const BUDGET_COOKIE_NAME = 'budget_auth';
export const BUDGET_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export { createAuthToken, verifyAuthToken, timingSafeStringEqual } from './dashboardAuth';
