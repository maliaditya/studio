import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPPORT_DONATIONS_TABLE = 'user_support_donations';

export type SupportDonationProvider = 'razorpay' | 'upi' | 'paypal' | 'buymeacoffee';
export type SupportDonationStatus = 'started' | 'completed' | 'failed';

export type SupportDonationRecord = {
  id: string;
  username: string | null;
  email: string | null;
  sessionId: string;
  provider: SupportDonationProvider;
  providerPaymentId: string | null;
  providerOrderId: string | null;
  amountInr: number;
  currency: string;
  status: SupportDonationStatus;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
};

export type SupportDonationOverview = SupportDonationRecord;

type SupportDonationRow = {
  id: string;
  username: string | null;
  email: string | null;
  session_id: string;
  provider: string;
  provider_payment_id: string | null;
  provider_order_id: string | null;
  amount_inr: number;
  currency: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
};

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

const getSupabaseUrl = () => process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const getServiceRoleKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const normalizeUsername = (value?: string | null) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || null;
};

const normalizeEmail = (value?: string | null) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || null;
};

const normalizeIso = (value?: string | null) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};

const normalizeProvider = (value: unknown): SupportDonationProvider => {
  if (value === 'razorpay' || value === 'upi' || value === 'paypal' || value === 'buymeacoffee') return value;
  throw new Error('Unsupported donation provider.');
};

const normalizeStatus = (value: unknown): SupportDonationStatus => {
  if (value === 'started' || value === 'completed' || value === 'failed') return value;
  throw new Error('Unsupported donation status.');
};

const toRecord = (row: SupportDonationRow): SupportDonationRecord => ({
  id: row.id,
  username: normalizeUsername(row.username),
  email: normalizeEmail(row.email),
  sessionId: row.session_id,
  provider: normalizeProvider(row.provider),
  providerPaymentId: row.provider_payment_id || null,
  providerOrderId: row.provider_order_id || null,
  amountInr: Number(row.amount_inr || 0),
  currency: String(row.currency || 'INR'),
  status: normalizeStatus(row.status),
  createdAt: normalizeIso(row.created_at),
  updatedAt: normalizeIso(row.updated_at),
  completedAt: normalizeIso(row.completed_at),
});

const withHelpfulTableError = (error: unknown, fallbackMessage: string): never => {
  const message = error instanceof Error ? error.message : String(error || '');
  const lower = message.toLowerCase();
  if (lower.includes('relation') && lower.includes(SUPPORT_DONATIONS_TABLE)) {
    throw new Error('Support donations table is missing. Run docs/auth-users.sql in Supabase SQL Editor before recording donations.');
  }
  if (lower.includes('could not find the table') && lower.includes(SUPPORT_DONATIONS_TABLE)) {
    throw new Error('Support donations table is missing. Run docs/auth-users.sql in Supabase SQL Editor before recording donations.');
  }
  throw new Error(message || fallbackMessage);
};

export const isSupportDonationsDbConfigured = (): boolean => Boolean(getSupabaseUrl().trim() && getServiceRoleKey().trim());

const getAdminClient = () => {
  const url = getSupabaseUrl().trim();
  const key = getServiceRoleKey().trim();
  if (!url || !key) {
    throw new Error('Supabase server credentials are missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  const configKey = `${url}::${key}`;
  if (!cachedClient || cachedConfigKey !== configKey) {
    cachedClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    cachedConfigKey = configKey;
  }
  return cachedClient;
};

export async function recordSupportDonationStarted(payload: {
  sessionId: string;
  username?: string | null;
  email?: string | null;
  provider: SupportDonationProvider;
  providerOrderId?: string | null;
  amountInr: number;
  currency?: string;
}): Promise<SupportDonationRecord | null> {
  if (!isSupportDonationsDbConfigured()) return null;

  const now = new Date().toISOString();

  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from(SUPPORT_DONATIONS_TABLE)
      .upsert(
        {
          id: randomUUID(),
          username: normalizeUsername(payload.username),
          email: normalizeEmail(payload.email),
          session_id: String(payload.sessionId || '').trim(),
          provider: normalizeProvider(payload.provider),
          provider_order_id: payload.providerOrderId ? String(payload.providerOrderId).trim() : null,
          amount_inr: Math.max(0, Math.round(Number(payload.amountInr || 0))),
          currency: String(payload.currency || 'INR').trim().toUpperCase() || 'INR',
          status: 'started',
          updated_at: now,
        },
        { onConflict: 'session_id' }
      )
      .select('id, username, email, session_id, provider, provider_payment_id, provider_order_id, amount_inr, currency, status, created_at, updated_at, completed_at')
      .single<SupportDonationRow>();

    if (error) {
      withHelpfulTableError(error, 'Failed to record support donation start.');
    }

    return toRecord(data);
  } catch (error) {
    withHelpfulTableError(error, 'Failed to record support donation start.');
  }
}

export async function markSupportDonationCompleted(payload: {
  sessionId: string;
  provider: SupportDonationProvider;
  providerPaymentId: string;
  providerOrderId: string;
  amountInr: number;
}): Promise<SupportDonationRecord | null> {
  if (!isSupportDonationsDbConfigured()) return null;

  const now = new Date().toISOString();
  const sessionId = String(payload.sessionId || '').trim();
  if (!sessionId) {
    throw new Error('Donation session id is required.');
  }

  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from(SUPPORT_DONATIONS_TABLE)
      .update({
        provider: normalizeProvider(payload.provider),
        provider_payment_id: String(payload.providerPaymentId || '').trim(),
        provider_order_id: String(payload.providerOrderId || '').trim(),
        amount_inr: Math.max(0, Math.round(Number(payload.amountInr || 0))),
        status: 'completed',
        completed_at: now,
        updated_at: now,
      })
      .eq('session_id', sessionId)
      .select('id, username, email, session_id, provider, provider_payment_id, provider_order_id, amount_inr, currency, status, created_at, updated_at, completed_at')
      .maybeSingle<SupportDonationRow>();

    if (error) {
      withHelpfulTableError(error, 'Failed to mark support donation completed.');
    }

    if (data) {
      return toRecord(data);
    }

    const { data: inserted, error: insertError } = await client
      .from(SUPPORT_DONATIONS_TABLE)
      .insert({
        id: randomUUID(),
        session_id: sessionId,
        provider: normalizeProvider(payload.provider),
        provider_payment_id: String(payload.providerPaymentId || '').trim(),
        provider_order_id: String(payload.providerOrderId || '').trim(),
        amount_inr: Math.max(0, Math.round(Number(payload.amountInr || 0))),
        currency: 'INR',
        status: 'completed',
        completed_at: now,
        updated_at: now,
      })
      .select('id, username, email, session_id, provider, provider_payment_id, provider_order_id, amount_inr, currency, status, created_at, updated_at, completed_at')
      .single<SupportDonationRow>();

    if (insertError) {
      withHelpfulTableError(insertError, 'Failed to insert completed support donation.');
    }

    return toRecord(inserted);
  } catch (error) {
    withHelpfulTableError(error, 'Failed to mark support donation completed.');
  }
}

export async function listSupportDonations(): Promise<SupportDonationOverview[]> {
  if (!isSupportDonationsDbConfigured()) return [];

  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from(SUPPORT_DONATIONS_TABLE)
      .select('id, username, email, session_id, provider, provider_payment_id, provider_order_id, amount_inr, currency, status, created_at, updated_at, completed_at')
      .order('completed_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .returns<SupportDonationRow[]>();

    if (error) {
      withHelpfulTableError(error, 'Failed to list support donations.');
    }

    return (data || []).map(toRecord);
  } catch (error) {
    withHelpfulTableError(error, 'Failed to list support donations.');
  }
}