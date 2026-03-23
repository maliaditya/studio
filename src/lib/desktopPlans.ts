import { DESKTOP_PLAN_BILLING_LABEL, DESKTOP_PLAN_PRICE_INR, normalizeDesktopPlanPriceInr } from '@/lib/desktopAccess';

export type DesktopPlanFeature = {
  id: string;
  label: string;
};

export type DesktopPlanValidity = 'monthly' | 'yearly' | 'lifetime';
export type DesktopPlanTaxMode = 'inclusive' | 'exclusive';

export const DESKTOP_PLAN_VALIDITY_LABELS: Record<DesktopPlanValidity, string> = {
  monthly: 'monthly',
  yearly: 'yearly',
  lifetime: 'lifetime',
};

export const DESKTOP_PLAN_TAX_MODE_LABELS: Record<DesktopPlanTaxMode, string> = {
  inclusive: 'Including GST',
  exclusive: 'Excluding GST',
};

export type DesktopPlanDefinition = {
  id: string;
  heading: string;
  description: string;
  recommended: boolean;
  priceInr: number;
  taxMode: DesktopPlanTaxMode;
  gstPercent: number;
  validity: DesktopPlanValidity;
  billingLabel: string;
  featureIds: string[];
};

export type DesktopPlanCatalog = {
  features: DesktopPlanFeature[];
  plans: DesktopPlanDefinition[];
};

const slugify = (value: string, fallback: string) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
};

const normalizeValidity = (value: unknown): DesktopPlanValidity => {
  if (value === 'monthly' || value === 'yearly' || value === 'lifetime') return value;
  return 'yearly';
};

const normalizeTaxMode = (value: unknown): DesktopPlanTaxMode => {
  if (value === 'inclusive' || value === 'exclusive') return value;
  return 'inclusive';
};

export const normalizeDesktopPlanGstPercent = (value: unknown, fallback = 18): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed * 100) / 100;
  return rounded >= 0 && rounded <= 100 ? rounded : fallback;
};

export const getDesktopPlanFinalPriceInr = (plan: DesktopPlanDefinition): number => {
  const basePrice = normalizeDesktopPlanPriceInr(plan.priceInr, DESKTOP_PLAN_PRICE_INR);
  if (plan.taxMode === 'inclusive') return basePrice;
  return Math.round(basePrice * (1 + normalizeDesktopPlanGstPercent(plan.gstPercent, 18) / 100));
};

const DEFAULT_FEATURES: DesktopPlanFeature[] = [
  { id: 'desktop-app', label: 'Desktop app access' },
  { id: 'yearly-updates', label: 'Yearly product updates' },
  { id: 'local-ai', label: 'Local Ollama support' },
  { id: 'backup-restore', label: 'Backup and restore tools' },
  { id: 'priority-support', label: 'Priority setup support' },
];

export const createDefaultDesktopPlanCatalog = (basePriceInr = DESKTOP_PLAN_PRICE_INR): DesktopPlanCatalog => ({
  features: DEFAULT_FEATURES,
  plans: [
    {
      id: 'starter',
      heading: 'Starter',
      description: 'Essential desktop access for solo use.',
      recommended: false,
      priceInr: normalizeDesktopPlanPriceInr(basePriceInr, DESKTOP_PLAN_PRICE_INR),
      taxMode: 'inclusive',
      gstPercent: 18,
      validity: 'monthly',
      billingLabel: DESKTOP_PLAN_VALIDITY_LABELS.monthly,
      featureIds: ['desktop-app', 'yearly-updates', 'backup-restore'],
    },
    {
      id: 'plus',
      heading: 'Plus',
      description: 'Desktop access with local AI workflows enabled.',
      recommended: true,
      priceInr: normalizeDesktopPlanPriceInr(Math.round(basePriceInr * 1.9), DESKTOP_PLAN_PRICE_INR),
      taxMode: 'inclusive',
      gstPercent: 18,
      validity: 'yearly',
      billingLabel: DESKTOP_PLAN_VALIDITY_LABELS.yearly,
      featureIds: ['desktop-app', 'yearly-updates', 'local-ai', 'backup-restore'],
    },
    {
      id: 'pro',
      heading: 'Pro',
      description: 'Full desktop access with priority setup support.',
      recommended: false,
      priceInr: normalizeDesktopPlanPriceInr(Math.round(basePriceInr * 3.1), DESKTOP_PLAN_PRICE_INR),
      taxMode: 'inclusive',
      gstPercent: 18,
      validity: 'lifetime',
      billingLabel: DESKTOP_PLAN_VALIDITY_LABELS.lifetime,
      featureIds: ['desktop-app', 'yearly-updates', 'local-ai', 'backup-restore', 'priority-support'],
    },
  ],
});

export const normalizeDesktopPlanCatalog = (
  value: unknown,
  fallbackPriceInr = DESKTOP_PLAN_PRICE_INR
): DesktopPlanCatalog => {
  const fallback = createDefaultDesktopPlanCatalog(fallbackPriceInr);
  if (!value || typeof value !== 'object') return fallback;

  const candidate = value as Partial<DesktopPlanCatalog>;
  const features = Array.isArray(candidate.features)
    ? candidate.features
        .map((feature, index) => {
          if (!feature || typeof feature !== 'object') return null;
          const featureRecord = feature as Partial<DesktopPlanFeature>;
          const label = String(featureRecord.label || '').trim();
          if (!label) return null;
          const id = slugify(String(featureRecord.id || label), `feature-${index + 1}`);
          return { id, label };
        })
        .filter((feature): feature is DesktopPlanFeature => Boolean(feature))
    : [];

  const normalizedFeatures = features.length > 0 ? features : fallback.features;
  const featureIdSet = new Set(normalizedFeatures.map((feature) => feature.id));

  const plans = Array.isArray(candidate.plans)
    ? candidate.plans
        .map((plan, index) => {
          if (!plan || typeof plan !== 'object') return null;
          const planRecord = plan as Partial<DesktopPlanDefinition>;
          const heading = String(planRecord.heading || '').trim();
          if (!heading) return null;
          const id = slugify(String(planRecord.id || heading), `plan-${index + 1}`);
          const featureIds = Array.isArray(planRecord.featureIds)
            ? Array.from(
                new Set(
                  planRecord.featureIds
                    .map((featureId) => String(featureId || '').trim())
                    .filter((featureId) => featureIdSet.has(featureId))
                )
              )
            : [];
          return {
            id,
            heading,
            description: String(planRecord.description || '').trim(),
            recommended: Boolean(planRecord.recommended),
            priceInr: normalizeDesktopPlanPriceInr(planRecord.priceInr, fallbackPriceInr),
            taxMode: normalizeTaxMode(planRecord.taxMode),
            gstPercent: normalizeDesktopPlanGstPercent(planRecord.gstPercent, 18),
            validity: normalizeValidity(planRecord.validity),
            billingLabel:
              String(planRecord.billingLabel || DESKTOP_PLAN_VALIDITY_LABELS[normalizeValidity(planRecord.validity)] || DESKTOP_PLAN_BILLING_LABEL).trim() || DESKTOP_PLAN_BILLING_LABEL,
            featureIds,
          };
        })
        .filter((plan): plan is DesktopPlanDefinition => Boolean(plan))
    : [];

  const normalizedPlans = plans.length > 0 ? plans : fallback.plans;
  const hasRecommended = normalizedPlans.some((plan) => plan.recommended);

  return {
    features: normalizedFeatures,
    plans: normalizedPlans.map((plan, index) => ({
      ...plan,
      recommended: hasRecommended ? plan.recommended : index === 0,
    })),
  };
};

export const getFeaturedDesktopPlan = (catalog: DesktopPlanCatalog): DesktopPlanDefinition => {
  const normalized = normalizeDesktopPlanCatalog(catalog);
  return normalized.plans.find((plan) => plan.recommended) || normalized.plans[0];
};

export const getDesktopPlanById = (catalog: DesktopPlanCatalog, planId?: string | null): DesktopPlanDefinition | null => {
  const normalized = normalizeDesktopPlanCatalog(catalog);
  if (!planId) return null;
  return normalized.plans.find((plan) => plan.id === planId) || null;
};