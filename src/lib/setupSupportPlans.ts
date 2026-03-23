import { normalizeDesktopPlanPriceInr } from '@/lib/desktopAccess';

export type SetupSupportFeature = {
  id: string;
  label: string;
};

export type SetupSupportPlanDefinition = {
  id: string;
  heading: string;
  description: string;
  priceInr: number;
  durationLabel: string;
  ctaLabel: string;
  featureIds: string[];
  recommended: boolean;
};

export type SetupSupportPlanCatalog = {
  features: SetupSupportFeature[];
  plans: SetupSupportPlanDefinition[];
};

const slugify = (value: string, fallback: string) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
};

export const createDefaultSetupSupportPlanCatalog = (): SetupSupportPlanCatalog => ({
  features: [
    { id: 'guided-call', label: 'Guided 1:1 session' },
    { id: 'workflow-review', label: 'Workflow review' },
    { id: 'setup-help', label: 'Setup assistance' },
    { id: 'priority-followup', label: 'Priority follow-up support' },
  ],
  plans: [
    {
      id: 'setup-call',
      heading: '1:1 Setup Call',
      description: 'Direct onboarding help to configure Dock around your workflow and daily execution system.',
      priceInr: 1499,
      durationLabel: '45 mins',
      ctaLabel: 'Pay with Razorpay',
      featureIds: ['guided-call', 'workflow-review', 'setup-help'],
      recommended: true,
    },
    {
      id: 'support-session',
      heading: 'Priority Support Session',
      description: 'A focused support block for debugging setup issues, workflow fixes, and implementation questions.',
      priceInr: 999,
      durationLabel: '30 mins',
      ctaLabel: 'Pay with Razorpay',
      featureIds: ['guided-call', 'setup-help', 'priority-followup'],
      recommended: false,
    },
  ],
});

export const normalizeSetupSupportPlanCatalog = (
  value: unknown
): SetupSupportPlanCatalog => {
  const fallback = createDefaultSetupSupportPlanCatalog();
  if (!value || typeof value !== 'object') return fallback;

  const candidate = value as Partial<SetupSupportPlanCatalog>;
  const features = Array.isArray(candidate.features)
    ? candidate.features
        .map((feature, index) => {
          if (!feature || typeof feature !== 'object') return null;
          const record = feature as Partial<SetupSupportFeature>;
          const label = String(record.label || '').trim();
          if (!label) return null;
          return {
            id: slugify(String(record.id || label), `setup-support-feature-${index + 1}`),
            label,
          } satisfies SetupSupportFeature;
        })
        .filter((feature): feature is SetupSupportFeature => Boolean(feature))
    : [];

  const normalizedFeatures = features.length > 0 ? features : fallback.features;
  const plans = Array.isArray(candidate.plans)
    ? candidate.plans
        .map((plan, index) => {
          if (!plan || typeof plan !== 'object') return null;
          const record = plan as Partial<SetupSupportPlanDefinition>;
          const heading = String(record.heading || '').trim();
          const description = String(record.description || '').trim();
          const durationLabel = String(record.durationLabel || '').trim();
          const ctaLabel = String(record.ctaLabel || '').trim();
          if (!heading) return null;
          return {
            id: slugify(String(record.id || heading), `setup-support-plan-${index + 1}`),
            heading,
            description: description || 'Describe what the user gets in this support plan.',
            priceInr: normalizeDesktopPlanPriceInr(record.priceInr, 499),
            durationLabel: durationLabel || '30 mins',
            ctaLabel: ctaLabel || 'Pay with Razorpay',
            featureIds: Array.isArray(record.featureIds)
              ? record.featureIds
                  .map((featureId) => String(featureId || '').trim())
                  .filter(Boolean)
              : [],
            recommended: Boolean(record.recommended),
          } satisfies SetupSupportPlanDefinition;
        })
        .filter((plan): plan is SetupSupportPlanDefinition => Boolean(plan))
    : [];

  if (plans.length === 0) return fallback;

  return {
    features: normalizedFeatures,
    plans: plans.map((plan, index) => ({
      ...plan,
      featureIds: plan.featureIds.filter((featureId) => normalizedFeatures.some((feature) => feature.id === featureId)),
      recommended: plans.some((entry) => entry.recommended) ? plan.recommended : index === 0,
    })),
  };
};