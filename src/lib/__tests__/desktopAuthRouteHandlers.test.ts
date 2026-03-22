import assert from 'node:assert/strict';
import test from 'node:test';

import { createLoginPostHandler, createRefreshPostHandler } from '../authRouteHandlers.ts';
import { hashPassword } from '../password.ts';

const buildLoginRequest = (body: Record<string, unknown>, desktop = false) =>
  new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(desktop ? { 'x-studio-desktop': '1' } : {}),
    },
    body: JSON.stringify(body),
  });

const buildRefreshRequest = (body: Record<string, unknown>, desktop = false) =>
  new Request('http://localhost/api/auth/refresh', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(desktop ? { 'x-studio-desktop': '1' } : {}),
    },
    body: JSON.stringify(body),
  });

const activeEntitlement = {
  paymentCompleted: true,
  purchaseDate: '2026-01-01T00:00:00.000Z',
  expiresAt: '2027-01-01T00:00:00.000Z',
};

test('desktop login succeeds for an active paid user', async () => {
  const password = 'desk-pass-123';
  const passwordRecord = hashPassword(password);
  let sessionCookieAttachedFor: string | null = null;

  const POST = createLoginPostHandler({
    verifyPassword: (candidate, record) =>
      record.passwordHash === passwordRecord.passwordHash &&
      record.passwordSalt === passwordRecord.passwordSalt &&
      record.passwordAlgo === passwordRecord.passwordAlgo &&
      candidate === password,
    attachSessionCookie: (_response, username) => {
      sessionCookieAttachedFor = username;
    },
    issueAuthTokens: async () => ({
      accessToken: 'access-token',
      accessTokenExpiresInSec: 900,
      refreshToken: 'refresh-token',
      refreshTokenExpiresAt: '2027-02-01T00:00:00.000Z',
    }),
    isAuthDbConfigured: () => true,
    readAuthUserByUsername: async (username) => ({
      username,
      email: 'PaidUser@Example.com',
      ...passwordRecord,
    }),
    assertDesktopAppLoginAllowed: async () => activeEntitlement,
  });

  const response = await POST(buildLoginRequest({ username: 'PaidUser', password }, true));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(sessionCookieAttachedFor, 'paiduser');
  assert.equal(payload.success, true);
  assert.equal(payload.user.username, 'paiduser');
  assert.equal(payload.user.email, 'paiduser@example.com');
  assert.deepEqual(payload.desktopEntitlement, activeEntitlement);
});

test('desktop login is blocked for an expired desktop user', async () => {
  const passwordRecord = hashPassword('desk-pass-123');
  let desktopCheckCount = 0;

  const POST = createLoginPostHandler({
    verifyPassword: () => true,
    attachSessionCookie: () => undefined,
    issueAuthTokens: async () => ({ accessToken: 'unused' }),
    isAuthDbConfigured: () => true,
    readAuthUserByUsername: async (username) => ({
      username,
      email: 'expired@example.com',
      ...passwordRecord,
    }),
    assertDesktopAppLoginAllowed: async () => {
      desktopCheckCount += 1;
      throw new Error('Desktop access for this account is inactive or expired. Renew the yearly desktop plan to continue using the desktop app.');
    },
  });

  const response = await POST(buildLoginRequest({ username: 'ExpiredUser', password: 'desk-pass-123' }, true));
  const payload = await response.json();

  assert.equal(desktopCheckCount, 1);
  assert.equal(response.status, 403);
  assert.equal(payload.code, 'DESKTOP_ACCESS_EXPIRED');
  assert.match(payload.error, /inactive or expired/i);
});

test('web login does not enforce desktop entitlement', async () => {
  const passwordRecord = hashPassword('web-pass-123');
  let desktopCheckCount = 0;

  const POST = createLoginPostHandler({
    verifyPassword: () => true,
    attachSessionCookie: () => undefined,
    issueAuthTokens: async () => ({ accessToken: 'access-token', refreshToken: 'refresh-token' }),
    isAuthDbConfigured: () => true,
    readAuthUserByUsername: async (username) => ({
      username,
      email: 'web@example.com',
      ...passwordRecord,
    }),
    assertDesktopAppLoginAllowed: async () => {
      desktopCheckCount += 1;
      throw new Error('should not be called');
    },
  });

  const response = await POST(buildLoginRequest({ username: 'WebUser', password: 'web-pass-123' }, false));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(desktopCheckCount, 0);
  assert.equal('desktopEntitlement' in payload, false);
});

test('desktop refresh succeeds for an active paid user', async () => {
  let sessionCookieAttachedFor: string | null = null;

  const POST = createRefreshPostHandler({
    createAccessToken: () => 'next-access-token',
    rotateRefreshToken: async () => ({
      refreshToken: 'next-refresh-token',
      expiresAt: '2027-02-15T00:00:00.000Z',
    }),
    verifyRefreshToken: async () => ({ username: 'paiduser' }),
    attachSessionCookie: (_response, username) => {
      sessionCookieAttachedFor = username;
    },
    readAuthUserByUsername: async () => ({ email: 'paiduser@example.com' }),
    assertDesktopAppLoginAllowed: async () => activeEntitlement,
  });

  const response = await POST(buildRefreshRequest({ refreshToken: 'old-refresh-token' }, true));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(sessionCookieAttachedFor, 'paiduser');
  assert.equal(payload.user.username, 'paiduser');
  assert.deepEqual(payload.desktopEntitlement, activeEntitlement);
});

test('desktop refresh is blocked for an expired desktop user', async () => {
  let desktopCheckCount = 0;

  const POST = createRefreshPostHandler({
    createAccessToken: () => 'unused',
    rotateRefreshToken: async () => ({
      refreshToken: 'unused',
      expiresAt: '2027-02-15T00:00:00.000Z',
    }),
    verifyRefreshToken: async () => ({ username: 'expireduser' }),
    attachSessionCookie: () => undefined,
    readAuthUserByUsername: async () => ({ email: 'expired@example.com' }),
    assertDesktopAppLoginAllowed: async () => {
      desktopCheckCount += 1;
      throw new Error('Desktop access for this account is inactive or expired. Renew the yearly desktop plan to continue using the desktop app.');
    },
  });

  const response = await POST(buildRefreshRequest({ refreshToken: 'old-refresh-token' }, true));
  const payload = await response.json();

  assert.equal(desktopCheckCount, 1);
  assert.equal(response.status, 403);
  assert.equal(payload.code, 'DESKTOP_ACCESS_EXPIRED');
  assert.match(payload.error, /inactive or expired/i);
});