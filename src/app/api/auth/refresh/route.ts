import { createAccessToken, rotateRefreshToken, verifyRefreshToken } from "@/lib/authTokens";
import { attachSessionCookie } from "@/lib/serverSession";
import { readAuthUserByUsername } from "@/lib/authUsersServer";
import { assertDesktopAppLoginAllowed } from '@/lib/desktopStatusServer';
import { createRefreshPostHandler } from '@/lib/authRouteHandlers';

export const dynamic = "force-dynamic";

export const POST = createRefreshPostHandler({
  createAccessToken,
  rotateRefreshToken,
  verifyRefreshToken,
  attachSessionCookie,
  readAuthUserByUsername,
  assertDesktopAppLoginAllowed,
});
