import { NextResponse } from "next/server";
import { createAccessToken, rotateRefreshToken, verifyRefreshToken } from "@/lib/authTokens";
import { attachSessionCookie } from "@/lib/serverSession";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { refreshToken?: string };
    const refreshToken = String(payload?.refreshToken || "");
    if (!refreshToken) {
      return NextResponse.json({ error: "refreshToken is required." }, { status: 400 });
    }

    const current = await verifyRefreshToken(refreshToken);
    if (!current) {
      return NextResponse.json({ error: "Invalid or expired refresh token." }, { status: 401 });
    }

    const rotated = await rotateRefreshToken(refreshToken);
    if (!rotated) {
      return NextResponse.json({ error: "Invalid or expired refresh token." }, { status: 401 });
    }

    const accessToken = createAccessToken(current.username);
    const response = NextResponse.json({
      success: true,
      user: { username: current.username },
      accessToken,
      accessTokenExpiresInSec: 15 * 60,
      refreshToken: rotated.refreshToken,
      refreshTokenExpiresAt: rotated.expiresAt,
    });
    attachSessionCookie(response, current.username);
    return response;
  } catch (error) {
    console.error("POST /api/auth/refresh error:", error);
    return NextResponse.json({ error: "Failed to refresh session." }, { status: 500 });
  }
}
