/**
 * Signed-cookie auth for the private /dashboard routes. Uses Web Crypto (crypto.subtle) rather
 * than Node's crypto module so the same code runs unchanged in both the Edge middleware runtime
 * and the Node API route runtime.
 */

export const DASHBOARD_COOKIE_NAME = 'job_hunt_auth';
export const DASHBOARD_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function toBase64Url(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < view.length; i++) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function createAuthToken(secret: string): Promise<string> {
  const payload = `authenticated.${Date.now()}`;
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return `${payload}.${toBase64Url(signature)}`;
}

export async function verifyAuthToken(token: string | undefined | null, secret: string): Promise<boolean> {
  if (!token) return false;

  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return false;

  const payload = token.slice(0, lastDot);
  const signaturePart = token.slice(lastDot + 1);

  try {
    const key = await importKey(secret);
    const signatureBuffer = fromBase64Url(signaturePart);
    return await crypto.subtle.verify('HMAC', key, signatureBuffer, new TextEncoder().encode(payload));
  } catch {
    return false;
  }
}

/** Not cryptographically constant-time (the length check short-circuits), but avoids the
 * character-by-character early-exit that makes naive === comparisons timing-attackable. */
export function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
