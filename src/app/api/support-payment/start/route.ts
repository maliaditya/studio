import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getRazorpayClient, getRazorpayKeyId, isRazorpayConfigured } from '@/lib/razorpayServer';
import { recordSupportDonationStarted } from '@/lib/supportDonationsServer';

export const dynamic = 'force-dynamic';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?\d{10,15}$/;

const formatAmount = (amountInr: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amountInr);

const toRazorpayPrefill = (username?: string, email?: string) => {
  const trimmedUsername = String(username || '').trim();
  const trimmedEmail = String(email || '').trim().toLowerCase();
  const digits = trimmedUsername.replace(/\D/g, '');
  const contact = PHONE_PATTERN.test(trimmedUsername) || (digits.length >= 10 && digits.length <= 15)
    ? trimmedUsername.startsWith('+')
      ? trimmedUsername
      : digits.length === 10
      ? `+91${digits}`
      : `+${digits}`
    : undefined;
  const normalizedEmail = EMAIL_PATTERN.test(trimmedEmail) ? trimmedEmail : undefined;

  return {
    ...(trimmedUsername ? { name: trimmedUsername } : {}),
    ...(contact ? { contact } : {}),
    ...(normalizedEmail ? { email: normalizedEmail } : {}),
  };
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { amountInr?: number; username?: string; email?: string; planId?: string; planHeading?: string };
    const amountInr = Math.round(Number(payload?.amountInr || 0));
    if (!Number.isFinite(amountInr) || amountInr < 99) {
      return NextResponse.json({ error: 'A valid support amount of at least Rs. 99 is required.' }, { status: 400 });
    }

    if (!isRazorpayConfigured()) {
      return NextResponse.json({ error: 'Razorpay is not configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable support payments.' }, { status: 400 });
    }

    const sessionId = randomUUID();
    const receipt = `support_${Date.now()}`;
    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: amountInr * 100,
      currency: 'INR',
      receipt,
      notes: {
        supportSessionId: sessionId,
        supportAmountInr: String(amountInr),
        username: String(payload?.username || '').trim().slice(0, 64),
      },
    });

    try {
      await recordSupportDonationStarted({
        sessionId,
        username: payload?.username,
        email: payload?.email,
        planId: payload?.planId,
        planHeading: payload?.planHeading,
        provider: 'razorpay',
        providerOrderId: order.id,
        amountInr,
        currency: order.currency,
      });
    } catch (error) {
      console.error('Failed to persist support donation start:', error);
    }

    return NextResponse.json({
      success: true,
      sessionId,
      checkoutData: {
        keyId: getRazorpayKeyId(),
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        name: 'Dock',
        description: payload?.planHeading ? `${payload.planHeading} (${formatAmount(amountInr)})` : `Support Dock (${formatAmount(amountInr)})`,
        prefill: toRazorpayPrefill(payload?.username, payload?.email),
      },
      message: 'Razorpay support order created.',
    });
  } catch (error) {
    console.error('POST /api/support-payment/start error:', error);
    const message = error instanceof Error ? error.message : 'Failed to start support checkout.';
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'production' ? 'Failed to start support checkout.' : message },
      { status: 500 }
    );
  }
}