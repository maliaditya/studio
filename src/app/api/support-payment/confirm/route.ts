import { createHmac } from 'crypto';
import { NextResponse } from 'next/server';
import { getRazorpayKeySecret, isRazorpayConfigured } from '@/lib/razorpayServer';
import { markSupportDonationCompleted } from '@/lib/supportDonationsServer';

export const dynamic = 'force-dynamic';

const formatAmount = (amountInr: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amountInr);

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      sessionId?: string;
      providerSessionId?: string;
      providerOrderId?: string;
      providerSignature?: string;
      amountInr?: number;
    };

    const sessionId = String(payload?.sessionId || '').trim();
    const providerSessionId = String(payload?.providerSessionId || '').trim();
    const providerOrderId = String(payload?.providerOrderId || '').trim();
    const providerSignature = String(payload?.providerSignature || '').trim();
    const amountInr = Math.round(Number(payload?.amountInr || 0));

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 });
    }
    if (!providerSessionId || !providerOrderId || !providerSignature) {
      return NextResponse.json({ error: 'Razorpay payment details are required.' }, { status: 400 });
    }
    if (!isRazorpayConfigured()) {
      return NextResponse.json({ error: 'Razorpay is not configured yet.' }, { status: 400 });
    }

    const expectedSignature = createHmac('sha256', getRazorpayKeySecret())
      .update(`${providerOrderId}|${providerSessionId}`)
      .digest('hex');

    if (expectedSignature !== providerSignature) {
      return NextResponse.json({ error: 'Razorpay payment verification failed.' }, { status: 400 });
    }

    try {
      await markSupportDonationCompleted({
        sessionId,
        provider: 'razorpay',
        providerPaymentId: providerSessionId,
        providerOrderId,
        amountInr,
      });
    } catch (error) {
      console.error('Failed to persist completed support donation:', error);
    }

    return NextResponse.json({
      success: true,
      message:
        amountInr > 0
          ? `Thanks for supporting Dock with ${formatAmount(amountInr)}.`
          : 'Thanks for supporting Dock.',
      paymentId: providerSessionId,
      orderId: providerOrderId,
      sessionId,
    });
  } catch (error) {
    console.error('POST /api/support-payment/confirm error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to confirm support payment.' },
      { status: 400 }
    );
  }
}