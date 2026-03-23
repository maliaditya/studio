import { NextResponse } from 'next/server';
import { createDesktopCheckoutState, readDesktopAccessState, resolveDesktopAccessUser, writeDesktopAccessState } from '@/lib/desktopAccessServer';
import { readConfiguredDesktopPlanCatalog } from '@/lib/appConfigServer';
import { DESKTOP_PLAN_CURRENCY, DESKTOP_PLAN_ID, formatDesktopPlanPrice, type DesktopPaymentProvider } from '@/lib/desktopAccess';
import { getDesktopPlanById, getDesktopPlanFinalPriceInr, getFeaturedDesktopPlan } from '@/lib/desktopPlans';
import { getRazorpayClient, getRazorpayKeyId, isRazorpayConfigured } from '@/lib/razorpayServer';

export const dynamic = 'force-dynamic';

const isProvider = (value: unknown): value is DesktopPaymentProvider =>
  value === 'razorpay' || value === 'upi' || value === 'paypal';

const toRazorpayPrefill = (username: string) => {
  const trimmed = String(username || '').trim();
  const digits = trimmed.replace(/\D/g, '');
  const isPhoneLike = /^\+?\d{10,15}$/.test(trimmed) || (digits.length >= 10 && digits.length <= 15);
  const normalizedContact = isPhoneLike
    ? trimmed.startsWith('+')
      ? trimmed
      : digits.length === 10
      ? `+91${digits}`
      : `+${digits}`
    : undefined;
  const normalizedEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : undefined;

  return {
    name: trimmed,
    ...(normalizedContact ? { contact: normalizedContact } : {}),
    ...(normalizedEmail ? { email: normalizedEmail } : {}),
  };
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { provider?: DesktopPaymentProvider; username?: string; planId?: string };
    const sessionUser = resolveDesktopAccessUser(request, payload?.username);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 });
    }
    if (!isProvider(payload?.provider)) {
      return NextResponse.json({ error: 'A valid payment provider is required.' }, { status: 400 });
    }

    const current = await readDesktopAccessState(request, sessionUser);
    if (current.hasAccess) {
      return NextResponse.json({
        access: current,
        message: 'Desktop access is already active for this account.',
      });
    }

    const desktopPlanCatalog = await readConfiguredDesktopPlanCatalog();
    const selectedPlan = getDesktopPlanById(desktopPlanCatalog, payload.planId) || getFeaturedDesktopPlan(desktopPlanCatalog);
    const desktopPlanPriceInr = getDesktopPlanFinalPriceInr(selectedPlan);
    const desktopPlanPriceSubunits = desktopPlanPriceInr * 100;
    const desktopPlanDisplayPrice = formatDesktopPlanPrice(desktopPlanPriceInr);

    let next = createDesktopCheckoutState(current, payload.provider, desktopPlanPriceInr, {
      planId: selectedPlan.id || DESKTOP_PLAN_ID,
      planHeading: selectedPlan.heading,
      planValidity: selectedPlan.validity,
      billingLabel: selectedPlan.billingLabel,
    });
    let checkoutUrl: string | null = null;
    let checkoutData: Record<string, unknown> | null = null;

    if (payload.provider === 'razorpay' || payload.provider === 'upi') {
      if (!isRazorpayConfigured()) {
        return NextResponse.json({ error: 'Razorpay is not configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable Razorpay payments.' }, { status: 400 });
      }

      const razorpay = getRazorpayClient();
      const internalSessionId = next.currentSession?.id;
      if (!internalSessionId) {
        throw new Error('Failed to create an internal desktop checkout session.');
      }

      const order = await razorpay.orders.create({
        amount: desktopPlanPriceSubunits,
        currency: DESKTOP_PLAN_CURRENCY,
        receipt: internalSessionId,
        notes: {
          desktopAccessSessionId: internalSessionId,
            desktopPlanId: selectedPlan.id || DESKTOP_PLAN_ID,
            desktopPlanHeading: selectedPlan.heading,
          username: sessionUser,
        },
      });

      checkoutData = {
        keyId: getRazorpayKeyId(),
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        name: 'Dock',
        description: payload.provider === 'upi' ? `${selectedPlan.heading} ${selectedPlan.billingLabel} access via UPI (${desktopPlanDisplayPrice})` : `${selectedPlan.heading} ${selectedPlan.billingLabel} access (${desktopPlanDisplayPrice})`,
        method: payload.provider === 'upi' ? 'upi' : 'card',
        prefill: toRazorpayPrefill(sessionUser),
      };
      next = {
        ...next,
        currentSession: next.currentSession
          ? {
              ...next.currentSession,
              providerSessionId: order.id,
              note:
                payload.provider === 'upi'
                  ? `Razorpay UPI order created for ${selectedPlan.heading}. Open Razorpay Checkout to complete payment.`
                  : `Razorpay card order created for ${selectedPlan.heading}. Open Razorpay Checkout to complete payment.`,
            }
          : null,
      };
    }

    const response = NextResponse.json({
      access: next,
      sessionId: next.currentSession?.id || null,
      checkoutUrl,
      checkoutData,
      message:
        payload.provider === 'razorpay'
          ? 'Razorpay order created. Open the card checkout to complete payment.'
          : payload.provider === 'upi'
          ? 'Razorpay order created. Open the UPI checkout to complete payment.'
          : `Created ${payload.provider} checkout session. Confirm the payment step to unlock desktop access.`,
    });
    await writeDesktopAccessState(sessionUser, next, response);
    return response;
  } catch (error) {
    console.error('POST /api/desktop-access/start error:', error);
    const message = error instanceof Error ? error.message : 'Failed to start desktop checkout.';
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'production' ? 'Failed to start desktop checkout.' : message },
      { status: 500 }
    );
  }
}
