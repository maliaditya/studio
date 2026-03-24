import { type DesktopPlanValidity } from '@/lib/desktopPlans';

export const DESKTOP_PLAN_ID = 'desktop_yearly' as const;
export const DESKTOP_PLAN_PRICE_INR = 799;
export const DESKTOP_PLAN_CURRENCY = 'INR' as const;
export const DESKTOP_PLAN_PRICE_SUBUNITS = DESKTOP_PLAN_PRICE_INR * 100;
export const DESKTOP_PLAN_BILLING_LABEL = 'yearly' as const;
const DESKTOP_PLAN_PRICE_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: DESKTOP_PLAN_CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const normalizeDesktopPlanPriceInr = (value: unknown, fallback = DESKTOP_PLAN_PRICE_INR): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  return rounded >= 0 ? rounded : fallback;
};

export const formatDesktopPlanPrice = (amountInr: number): string =>
  DESKTOP_PLAN_PRICE_FORMATTER.format(normalizeDesktopPlanPriceInr(amountInr));

export const DESKTOP_PLAN_DISPLAY_PRICE = formatDesktopPlanPrice(DESKTOP_PLAN_PRICE_INR);

export type DesktopPaymentProvider = 'razorpay' | 'upi' | 'paypal' | 'free';
export type DesktopCheckoutStatus = 'pending' | 'completed' | 'failed';
export type DesktopAccessStatus = 'locked' | 'pending' | 'active';

export interface DesktopCheckoutSession {
  id: string;
  planId: string;
  planHeading: string;
  planValidity: DesktopPlanValidity;
  billingLabel: string;
  provider: DesktopPaymentProvider;
  providerSessionId: string | null;
  status: DesktopCheckoutStatus;
  amountUsd: number;
  currency: typeof DESKTOP_PLAN_CURRENCY;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  note: string | null;
}

export interface DesktopAccessState {
  planId: string;
  planHeading: string;
  planValidity: DesktopPlanValidity;
  billingLabel: string;
  amountUsd: number;
  currency: typeof DESKTOP_PLAN_CURRENCY;
  hasAccess: boolean;
  status: DesktopAccessStatus;
  activeProvider: DesktopPaymentProvider | null;
  grantedAt: string | null;
  expiresAt: string | null;
  updatedAt: string | null;
  currentSession: DesktopCheckoutSession | null;
  history: DesktopCheckoutSession[];
}

export const DESKTOP_PAYMENT_METHODS: Array<{
  id: DesktopPaymentProvider;
  title: string;
  description: string;
}> = [
  {
    id: 'razorpay',
    title: 'Credit / Debit Card',
    description: 'Razorpay-backed card checkout flow.',
  },
  {
    id: 'upi',
    title: 'UPI',
    description: 'Razorpay-backed UPI checkout flow for supported regions.',
  },
];

export const createEmptyDesktopAccessState = (): DesktopAccessState => ({
  planId: DESKTOP_PLAN_ID,
  planHeading: 'Desktop',
  planValidity: 'yearly',
  billingLabel: DESKTOP_PLAN_BILLING_LABEL,
  amountUsd: DESKTOP_PLAN_PRICE_INR,
  currency: DESKTOP_PLAN_CURRENCY,
  hasAccess: false,
  status: 'locked',
  activeProvider: null,
  grantedAt: null,
  expiresAt: null,
  updatedAt: null,
  currentSession: null,
  history: [],
});

const addMonthsToIso = (value: string, monthCount: number): string | null => {
  const next = new Date(value);
  if (Number.isNaN(next.getTime())) return null;
  next.setMonth(next.getMonth() + monthCount);
  return next.toISOString();
};

const getExpiryFromValidity = (grantedAt: string | null, planValidity: DesktopPlanValidity): string | null => {
  if (!grantedAt) return null;
  if (planValidity === 'lifetime') return null;
  if (planValidity === 'monthly') return addMonthsToIso(grantedAt, 1);
  return addMonthsToIso(grantedAt, 12);
};

const isProvider = (value: unknown): value is DesktopPaymentProvider =>
  value === 'razorpay' || value === 'upi' || value === 'paypal' || value === 'free';

const normalizeProvider = (value: unknown): DesktopPaymentProvider | null => {
  if (value === 'stripe') return 'razorpay';
  return isProvider(value) ? value : null;
};

const isCheckoutStatus = (value: unknown): value is DesktopCheckoutStatus =>
  value === 'pending' || value === 'completed' || value === 'failed';

const isAccessStatus = (value: unknown): value is DesktopAccessStatus =>
  value === 'locked' || value === 'pending' || value === 'active';

const normalizeSession = (value: unknown): DesktopCheckoutSession | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<DesktopCheckoutSession>;
  if (typeof candidate.id !== 'string' || !candidate.id.trim()) return null;
  const provider = normalizeProvider(candidate.provider);
  if (!provider) return null;

  return {
    id: candidate.id,
    planId: typeof candidate.planId === 'string' && candidate.planId.trim() ? candidate.planId.trim() : DESKTOP_PLAN_ID,
    planHeading: typeof candidate.planHeading === 'string' && candidate.planHeading.trim() ? candidate.planHeading.trim() : 'Desktop',
    planValidity: candidate.planValidity === 'monthly' || candidate.planValidity === 'yearly' || candidate.planValidity === 'lifetime' ? candidate.planValidity : 'yearly',
    billingLabel: typeof candidate.billingLabel === 'string' && candidate.billingLabel.trim() ? candidate.billingLabel.trim() : DESKTOP_PLAN_BILLING_LABEL,
    provider,
    providerSessionId: typeof candidate.providerSessionId === 'string' ? candidate.providerSessionId : null,
    status: isCheckoutStatus(candidate.status) ? candidate.status : 'pending',
    amountUsd: typeof candidate.amountUsd === 'number' && Number.isFinite(candidate.amountUsd) ? candidate.amountUsd : DESKTOP_PLAN_PRICE_INR,
    currency: candidate.currency === DESKTOP_PLAN_CURRENCY ? DESKTOP_PLAN_CURRENCY : DESKTOP_PLAN_CURRENCY,
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date(0).toISOString(),
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date(0).toISOString(),
    completedAt: typeof candidate.completedAt === 'string' ? candidate.completedAt : null,
    note: typeof candidate.note === 'string' ? candidate.note : null,
  };
};

export const normalizeDesktopAccessState = (value: unknown): DesktopAccessState => {
  const fallback = createEmptyDesktopAccessState();
  if (!value || typeof value !== 'object') return fallback;

  const candidate = value as Partial<DesktopAccessState>;
  const currentSession = normalizeSession(candidate.currentSession);
  const history = Array.isArray(candidate.history)
    ? candidate.history.map(normalizeSession).filter((session): session is DesktopCheckoutSession => Boolean(session))
    : [];
  const grantedAt = typeof candidate.grantedAt === 'string' ? candidate.grantedAt : null;
  const planValidity = candidate.planValidity === 'monthly' || candidate.planValidity === 'yearly' || candidate.planValidity === 'lifetime'
    ? candidate.planValidity
    : currentSession?.planValidity || 'yearly';
  const expiresAt = typeof candidate.expiresAt === 'string'
    ? candidate.expiresAt
    : getExpiryFromValidity(grantedAt, planValidity);
  const expiresAtTime = expiresAt ? Date.parse(expiresAt) : Number.NaN;
  const isExpired = planValidity === 'lifetime' ? false : Number.isFinite(expiresAtTime) && expiresAtTime <= Date.now();

  const normalized: DesktopAccessState = {
    planId: typeof candidate.planId === 'string' && candidate.planId.trim() ? candidate.planId.trim() : DESKTOP_PLAN_ID,
    planHeading: typeof candidate.planHeading === 'string' && candidate.planHeading.trim() ? candidate.planHeading.trim() : currentSession?.planHeading || 'Desktop',
    planValidity,
    billingLabel: typeof candidate.billingLabel === 'string' && candidate.billingLabel.trim() ? candidate.billingLabel.trim() : currentSession?.billingLabel || DESKTOP_PLAN_BILLING_LABEL,
    amountUsd: typeof candidate.amountUsd === 'number' && Number.isFinite(candidate.amountUsd) ? candidate.amountUsd : DESKTOP_PLAN_PRICE_INR,
    currency: candidate.currency === DESKTOP_PLAN_CURRENCY ? DESKTOP_PLAN_CURRENCY : DESKTOP_PLAN_CURRENCY,
    hasAccess: Boolean(candidate.hasAccess) && !isExpired,
    status: isAccessStatus(candidate.status) ? candidate.status : fallback.status,
    activeProvider: normalizeProvider(candidate.activeProvider),
    grantedAt,
    expiresAt,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : null,
    currentSession,
    history,
  };

  if (normalized.hasAccess) {
    normalized.status = 'active';
  } else if (normalized.currentSession?.status === 'pending') {
    normalized.status = 'pending';
  } else if (normalized.status !== 'active') {
    normalized.status = 'locked';
  }
  return normalized;
};






