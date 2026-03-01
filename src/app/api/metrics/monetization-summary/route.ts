import { NextResponse } from "next/server";
import { getMonetizationSummary, isMetricsStorageConfigured } from "@/lib/monetizationMetrics";
import { getSessionUserFromRequest } from "@/lib/serverSession";
import { verifyAccessToken } from "@/lib/authTokens";

export const dynamic = "force-dynamic";

const getAdminUsernames = (): string[] => {
  const fromEnv = (process.env.ADMIN_USERNAMES || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (fromEnv.length > 0) return fromEnv;
  return ["lonewolf"];
};

export async function GET(request: Request) {
  const sessionUser = getSessionUserFromRequest(request);
  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  const tokenPayload = bearerToken ? verifyAccessToken(bearerToken) : null;
  const tokenUser = tokenPayload?.sub?.trim().toLowerCase() || null;
  const effectiveUser = sessionUser || tokenUser;
  const admins = getAdminUsernames();
  if (!effectiveUser || !admins.includes(effectiveUser)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  if (!isMetricsStorageConfigured()) {
    return NextResponse.json({
      month: null,
      mau: 0,
      d30RetentionPercent: 0,
      supportPageViews: 0,
      supportCtaClicks: 0,
      donationIntentCount: 0,
      donationFunnelConversionPercent: 0,
      monthlyDonationRevenueUsd: 0,
      storageConfigured: false,
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || undefined;
    const summary = await getMonetizationSummary(month);
    return NextResponse.json({ ...summary, storageConfigured: true });
  } catch (error) {
    console.error("GET /api/metrics/monetization-summary error:", error);
    return NextResponse.json({ error: "Failed to compute monetization summary." }, { status: 500 });
  }
}
