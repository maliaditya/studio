import { list, put } from "@vercel/blob";

const METRICS_BLOB_PATH = "monetization-metrics.json";
const MONTH_KEY_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export type SupportEventType = "support_page_view" | "support_cta_click" | "donation_intent";
export type SupportChannel = "buymeacoffee" | "upi";

export interface MonthlyEngagementMetrics {
  activeUsers: string[];
}

export interface MonthlySupportMetrics {
  supportPageViews: number;
  supportCtaClicks: number;
  donationIntentCount: number;
  monthlyDonationRevenueUsd: number;
}

export interface MonetizationMetrics {
  engagement: {
    monthly: Record<string, MonthlyEngagementMetrics>;
  };
  support: {
    monthly: Record<string, MonthlySupportMetrics>;
  };
}

export interface MonetizationSummary {
  month: string;
  mau: number;
  d30RetentionPercent: number;
  supportPageViews: number;
  supportCtaClicks: number;
  donationIntentCount: number;
  donationFunnelConversionPercent: number;
  monthlyDonationRevenueUsd: number;
}

const createEmptyMetrics = (): MonetizationMetrics => ({
  engagement: { monthly: {} },
  support: { monthly: {} },
});

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const normalizeUsername = (username: string): string => username.trim().toLowerCase();

const dateToMonthKey = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const resolveMonthKey = (input?: string | Date): string => {
  if (!input) return dateToMonthKey(new Date());
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      throw new Error("Invalid date value.");
    }
    return dateToMonthKey(input);
  }

  if (MONTH_KEY_REGEX.test(input)) return input;

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid month/date input.");
  }
  return dateToMonthKey(parsed);
};

const getNextMonthKey = (monthKey: string): string => {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const next = new Date(Date.UTC(year, month, 1));
  return dateToMonthKey(next);
};

const hasBlobConfig = (): boolean => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export const ensureMonthBucket = (metrics: MonetizationMetrics, monthKey: string): MonetizationMetrics => {
  if (!metrics.engagement?.monthly) {
    metrics.engagement = { monthly: {} };
  }
  if (!metrics.support?.monthly) {
    metrics.support = { monthly: {} };
  }

  if (!metrics.engagement.monthly[monthKey]) {
    metrics.engagement.monthly[monthKey] = { activeUsers: [] };
  }
  if (!metrics.support.monthly[monthKey]) {
    metrics.support.monthly[monthKey] = {
      supportPageViews: 0,
      supportCtaClicks: 0,
      donationIntentCount: 0,
      monthlyDonationRevenueUsd: 0,
    };
  }

  return metrics;
};

export const readMetrics = async (): Promise<MonetizationMetrics> => {
  if (!hasBlobConfig()) return createEmptyMetrics();

  const { blobs } = await list({ prefix: METRICS_BLOB_PATH, limit: 1 });
  if (blobs.length === 0 || blobs[0]?.pathname !== METRICS_BLOB_PATH) {
    return createEmptyMetrics();
  }

  const response = await fetch(blobs[0].url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch monetization metrics. Status: ${response.status}`);
  }

  const raw = await response.text();
  if (!raw) return createEmptyMetrics();

  const parsed = JSON.parse(raw) as MonetizationMetrics;
  return {
    engagement: { monthly: parsed.engagement?.monthly || {} },
    support: { monthly: parsed.support?.monthly || {} },
  };
};

export const writeMetrics = async (metrics: MonetizationMetrics): Promise<void> => {
  if (!hasBlobConfig()) return;

  await put(METRICS_BLOB_PATH, JSON.stringify(metrics), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
};

export const updateMetrics = async (
  mutator: (draft: MonetizationMetrics) => MonetizationMetrics,
  maxRetries = 2
): Promise<MonetizationMetrics> => {
  if (!hasBlobConfig()) return createEmptyMetrics();

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const current = await readMetrics();
      const draft = deepClone(current);
      const next = mutator(draft);
      await writeMetrics(next);
      return next;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to update monetization metrics.");
};

export const recordEngagement = async (username: string, dateInput?: string): Promise<{ monthKey: string }> => {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    throw new Error("Username is required.");
  }

  const monthKey = resolveMonthKey(dateInput || new Date());
  await updateMetrics((draft) => {
    ensureMonthBucket(draft, monthKey);
    const users = draft.engagement.monthly[monthKey].activeUsers;
    if (!users.includes(normalized)) {
      users.push(normalized);
    }
    return draft;
  });

  return { monthKey };
};

export const recordSupportEvent = async (
  event: SupportEventType,
  options?: { date?: string; channel?: SupportChannel; amountUsd?: number }
): Promise<{ monthKey: string }> => {
  const monthKey = resolveMonthKey(options?.date || new Date());
  const amountUsd = typeof options?.amountUsd === "number" && options.amountUsd > 0 ? options.amountUsd : 0;

  await updateMetrics((draft) => {
    ensureMonthBucket(draft, monthKey);
    const bucket = draft.support.monthly[monthKey];

    if (event === "support_page_view") bucket.supportPageViews += 1;
    if (event === "support_cta_click") bucket.supportCtaClicks += 1;
    if (event === "donation_intent") bucket.donationIntentCount += 1;
    if (amountUsd > 0) bucket.monthlyDonationRevenueUsd += amountUsd;

    return draft;
  });

  return { monthKey };
};

export const getMonetizationSummary = async (monthInput?: string): Promise<MonetizationSummary> => {
  const month = resolveMonthKey(monthInput || new Date());
  const nextMonth = getNextMonthKey(month);
  const metrics = await readMetrics();

  const monthEngagement = metrics.engagement.monthly[month]?.activeUsers || [];
  const nextMonthEngagement = metrics.engagement.monthly[nextMonth]?.activeUsers || [];
  const monthSupport = metrics.support.monthly[month] || {
    supportPageViews: 0,
    supportCtaClicks: 0,
    donationIntentCount: 0,
    monthlyDonationRevenueUsd: 0,
  };

  const currentSet = new Set(monthEngagement);
  const nextSet = new Set(nextMonthEngagement);
  let retained = 0;
  currentSet.forEach((user) => {
    if (nextSet.has(user)) retained += 1;
  });

  const mau = currentSet.size;
  const d30 = mau > 0 ? (retained / mau) * 100 : 0;
  const conversion =
    monthSupport.supportPageViews > 0
      ? (monthSupport.donationIntentCount / monthSupport.supportPageViews) * 100
      : 0;

  return {
    month,
    mau,
    d30RetentionPercent: Number(d30.toFixed(2)),
    supportPageViews: monthSupport.supportPageViews,
    supportCtaClicks: monthSupport.supportCtaClicks,
    donationIntentCount: monthSupport.donationIntentCount,
    donationFunnelConversionPercent: Number(conversion.toFixed(2)),
    monthlyDonationRevenueUsd: Number(monthSupport.monthlyDonationRevenueUsd.toFixed(2)),
  };
};

export const isMetricsStorageConfigured = (): boolean => hasBlobConfig();
