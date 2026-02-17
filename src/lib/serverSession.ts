import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

export const SESSION_COOKIE_NAME = 'lifeos_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

type SessionPayload = {
  u: string;
  iat: number;
};

const getSessionSecret = () => {
  // Prefer dedicated session secret; fallback keeps dev usable.
  return process.env.LIFEOS_SESSION_SECRET || process.env.BLOB_READ_WRITE_TOKEN || 'lifeos-dev-session-secret';
};

const toBase64Url = (value: string) => Buffer.from(value, 'utf8').toString('base64url');
const fromBase64Url = (value: string) => Buffer.from(value, 'base64url').toString('utf8');

const sign = (encodedPayload: string) =>
  createHmac('sha256', getSessionSecret()).update(encodedPayload).digest('base64url');

const normalizeUsername = (username: string) => username.trim().toLowerCase();

export const createSessionValue = (username: string) => {
  const payload: SessionPayload = {
    u: normalizeUsername(username),
    iat: Date.now(),
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
};

const parseCookieHeader = (cookieHeader: string) => {
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawName, ...rest] = part.trim().split('=');
    if (!rawName) continue;
    const name = rawName.trim();
    const value = rest.join('=').trim();
    if (name === SESSION_COOKIE_NAME) return decodeURIComponent(value);
  }
  return null;
};

export const getSessionUserFromRequest = (request: Request): string | null => {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookieValue = parseCookieHeader(cookieHeader);
  if (!cookieValue) return null;

  const [encoded, providedSignature] = cookieValue.split('.');
  if (!encoded || !providedSignature) return null;

  const expectedSignature = sign(encoded);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as SessionPayload;
    if (!payload?.u || typeof payload.u !== 'string') return null;
    return normalizeUsername(payload.u);
  } catch {
    return null;
  }
};

export const attachSessionCookie = (response: NextResponse, username: string) => {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionValue(username),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
};

export const clearSessionCookie = (response: NextResponse) => {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
};

export const isAuthorizedUserRequest = (request: Request, username: string | null | undefined) => {
  if (!username) return false;
  const sessionUser = getSessionUserFromRequest(request);
  if (!sessionUser) return false;
  return sessionUser === normalizeUsername(username);
};
