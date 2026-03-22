
import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/password';
import { attachSessionCookie } from '@/lib/serverSession';
import { issueAuthTokens } from '@/lib/authTokens';
import { isAuthDbConfigured, readAuthUserByUsername } from '@/lib/authUsersServer';
import { assertDesktopAppLoginAllowed } from '@/lib/desktopStatusServer';
import { createLoginPostHandler } from '@/lib/authRouteHandlers';

export const dynamic = 'force-dynamic';

export const POST = createLoginPostHandler({
  verifyPassword,
  attachSessionCookie,
  issueAuthTokens,
  isAuthDbConfigured,
  readAuthUserByUsername,
  assertDesktopAppLoginAllowed,
});
