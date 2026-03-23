import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { completeDesktopCheckoutState, createDesktopCheckoutState, readDesktopAccessState, resolveDesktopAccessUser, writeDesktopAccessState } from '@/lib/desktopAccessServer';
import { upsertDesktopUserStatusFromAccessState } from '@/lib/desktopStatusServer';
import { updateAuthUserPrivilege } from '@/lib/authUsersServer';
import type { DesktopPaymentProvider } from '@/lib/desktopAccess';
import { getRazorpayKeySecret, isRazorpayConfigured } from '@/lib/razorpayServer';

export const dynamic = 'force-dynamic';

const isProvider = (value: unknown): value is DesktopPaymentProvider =>
  value === 'razorpay' || value === 'upi' || value === 'paypal';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      sessionId?: string;
      username?: string;
      provider?: DesktopPaymentProvider;
      providerSessionId?: string;
      providerOrderId?: string;
      providerSignature?: string;
    };
    const sessionUser = resolveDesktopAccessUser(request, payload?.username);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 });
    }
    const sessionId = String(payload?.sessionId || '').trim();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 });
    }

    const current = await readDesktopAccessState(request, sessionUser);
    const recoveryProvider = payload?.provider || current.currentSession?.provider || current.activeProvider;
    const providerSessionId = typeof payload?.providerSessionId === 'string' && payload.providerSessionId.trim()
      ? payload.providerSessionId.trim()
      : current.currentSession?.providerSessionId || null;
    const providerOrderId = typeof payload?.providerOrderId === 'string' && payload.providerOrderId.trim()
      ? payload.providerOrderId.trim()
      : current.currentSession?.providerSessionId || null;
    const providerSignature = typeof payload?.providerSignature === 'string' && payload.providerSignature.trim()
      ? payload.providerSignature.trim()
      : null;

    if (recoveryProvider === 'razorpay' || recoveryProvider === 'upi') {
      if (!isRazorpayConfigured()) {
        throw new Error('Razorpay is not configured yet. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to verify Razorpay payments.');
      }
      if (!providerSessionId) {
        throw new Error('Razorpay payment id is missing. Start a new Razorpay payment session.');
      }
      if (!providerOrderId) {
        throw new Error('Razorpay order id is missing. Start a new Razorpay payment session.');
      }
      if (!providerSignature) {
        throw new Error('Razorpay payment signature is missing. Start a new Razorpay payment session.');
      }

      const expectedSignature = createHmac('sha256', getRazorpayKeySecret())
        .update(`${providerOrderId}|${providerSessionId}`)
        .digest('hex');

      if (expectedSignature !== providerSignature) {
        throw new Error('Razorpay payment verification failed. Start a new Razorpay payment session.');
      }
    }

    const shouldRecoverPendingSession =
      process.env.NODE_ENV !== 'production' &&
      isProvider(recoveryProvider) &&
      recoveryProvider !== 'razorpay' &&
      recoveryProvider !== 'upi' &&
      (!current.currentSession || current.currentSession.id !== sessionId || current.currentSession.status !== 'pending');

    const next = shouldRecoverPendingSession
      ? completeDesktopCheckoutState(
          {
            ...createDesktopCheckoutState(current, recoveryProvider),
            currentSession: {
              id: sessionId,
              planId: current.planId,
              planHeading: current.planHeading,
              planValidity: current.planValidity,
              billingLabel: current.billingLabel,
              provider: recoveryProvider,
              providerSessionId: providerSessionId,
              status: 'pending',
              amountUsd: current.amountUsd,
              currency: current.currency,
              createdAt: current.updatedAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              completedAt: null,
              note: `Recovered ${recoveryProvider} checkout session for local confirmation.`,
            },
          },
          sessionId
        )
      : completeDesktopCheckoutState(current, sessionId);

    const response = NextResponse.json({
      access: next,
      message: 'Desktop access unlocked for this account.',
    });
    await writeDesktopAccessState(sessionUser, next, response);
    if (next.planValidity === 'lifetime') {
      await updateAuthUserPrivilege({ username: sessionUser, isPriviledge: true });
    }
    await upsertDesktopUserStatusFromAccessState(sessionUser, next);
    return response;
  } catch (error) {
    console.error('POST /api/desktop-access/confirm error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to confirm desktop checkout.' },
      { status: 400 }
    );
  }
}
