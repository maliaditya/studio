import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readAuthUserByUsername } from '@/lib/authUsersServer';
import { normalizeDesktopAccessState, type DesktopAccessState, type DesktopPaymentProvider } from '@/lib/desktopAccess';
import { readJsonFromStorage } from '@/lib/supabaseStorageServer';

const DESKTOP_STATUS_TABLE = 'user_desktop_status';
const AUTH_USERS_TABLE = 'auth_users';
const AUTH_USERS_OVERVIEW_SELECT = 'username, email, is_priviledge, created_at';
const AUTH_USERS_OVERVIEW_SELECT_LEGACY = 'username, email, created_at';

export type DesktopUserStatusRecord = {
  username: string;
  isPriviledge: boolean;
  paymentCompleted: boolean;
  purchaseDate: string | null;
  expiresAt: string | null;
  paymentProvider: DesktopPaymentProvider | null;
  createdAt: string | null;
  updatedAt: string | null;
  migratedFromStorageAt: string | null;
};

type DesktopUserStatusRow = {
  username: string;
  payment_completed: boolean | null;
  purchase_date: string | null;
  expires_at: string | null;
  payment_provider: string | null;
  created_at: string | null;
  updated_at: string | null;
  migrated_from_storage_at: string | null;
};

type DesktopUsersOverviewRow = {
  username: string;
  email: string | null;
  is_priviledge: boolean | null;
  created_at: string | null;
  user_desktop_status:
    | {
        payment_completed: boolean | null;
        purchase_date: string | null;
        expires_at: string | null;
        payment_provider: string | null;
        updated_at: string | null;
      }
    | {
        payment_completed: boolean | null;
        purchase_date: string | null;
        expires_at: string | null;
        payment_provider: string | null;
        updated_at: string | null;
      }[]
    | null;
};

type AuthUsersOverviewRow = {
  username: string;
  email: string | null;
  is_priviledge: boolean | null;
  created_at: string | null;
};

type LegacyAuthUsersOverviewRow = Omit<AuthUsersOverviewRow, 'is_priviledge'>;

export type DesktopUserPurchaseOverview = {
  username: string;
  email: string | null;
  isPriviledge: boolean;
  registeredAt: string | null;
  paymentCompleted: boolean;
  purchaseDate: string | null;
  expiresAt: string | null;
  paymentProvider: DesktopPaymentProvider | null;
  desktopStatus: 'active' | 'expired' | 'not-purchased' | 'privileged';
  updatedAt: string | null;
};

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

const getSupabaseUrl = () => process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const getServiceRoleKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const normalizeUsername = (username: string) => String(username || '').trim().toLowerCase();

const normalizeIso = (value?: string | null) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};

const normalizeProvider = (value: unknown): DesktopPaymentProvider | null => {
  if (value === 'razorpay' || value === 'upi' || value === 'paypal') return value;
  if (value === 'stripe') return 'razorpay';
  return null;
};

const describeDbError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message || String(error);
  }
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const nestedError = record.error;
    if (nestedError && nestedError !== error) {
      const nestedMessage = describeDbError(nestedError);
      if (nestedMessage) return nestedMessage;
    }
    const parts = [record.message, record.details, record.hint, record.code]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' | ');
    }

    const entries = Object.getOwnPropertyNames(record)
      .map((key) => {
        const value = record[key];
        return typeof value === 'string' ? `${key}: ${value.trim()}` : '';
      })
      .filter(Boolean);
    if (entries.length > 0) {
      return entries.join(' | ');
    }

    try {
      const serialized = JSON.stringify(record);
      if (serialized && serialized !== '{}') return serialized;
    } catch {
      // Fall through to generic coercion below.
    }
    return String(record);
  }
  return String(error || '');
};

const isMissingPrivilegeColumnError = (error: unknown): boolean => {
  const message = describeDbError(error);
  const lower = message.toLowerCase();
  return lower.includes('is_priviledge') && (lower.includes('column') || lower.includes('schema cache'));
};

const toRecord = (row: DesktopUserStatusRow): DesktopUserStatusRecord => ({
  username: normalizeUsername(row.username),
  isPriviledge: false,
  paymentCompleted: Boolean(row.payment_completed),
  purchaseDate: normalizeIso(row.purchase_date),
  expiresAt: normalizeIso(row.expires_at),
  paymentProvider: normalizeProvider(row.payment_provider),
  createdAt: normalizeIso(row.created_at),
  updatedAt: normalizeIso(row.updated_at),
  migratedFromStorageAt: normalizeIso(row.migrated_from_storage_at),
});

const withHelpfulTableError = (error: unknown, fallbackMessage: string): never => {
  const message = describeDbError(error);
  const lower = message.toLowerCase();
  if (lower.includes('relation') && lower.includes(DESKTOP_STATUS_TABLE)) {
    throw new Error('Desktop status table is missing. Run docs/auth-users.sql in Supabase SQL Editor before using desktop purchase enforcement.');
  }
  if (lower.includes('could not find the table') && lower.includes(DESKTOP_STATUS_TABLE)) {
    throw new Error('Desktop status table is missing. Run docs/auth-users.sql in Supabase SQL Editor before using desktop purchase enforcement.');
  }
  throw new Error(message || fallbackMessage);
};

export const isDesktopStatusDbConfigured = (): boolean => Boolean(getSupabaseUrl().trim() && getServiceRoleKey().trim());

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

const normalizeAuthUserTableError = (error: unknown, fallbackMessage: string): never => {
  const message = describeDbError(error);
  const lower = message.toLowerCase();
  if (lower.includes('relation') && lower.includes(AUTH_USERS_TABLE)) {
    throw new Error('Auth users table is missing. Run docs/auth-users.sql in Supabase SQL Editor before using admin desktop purchase reporting.');
  }
  if (lower.includes('could not find the table') && lower.includes(AUTH_USERS_TABLE)) {
    throw new Error('Auth users table is missing. Run docs/auth-users.sql in Supabase SQL Editor before using admin desktop purchase reporting.');
  }
  throw new Error(message || fallbackMessage);
};

const getLastCompletedPurchase = (accessState: DesktopAccessState) => {
  const sessions = [accessState.currentSession, ...accessState.history]
    .filter((session): session is NonNullable<DesktopAccessState['currentSession']> => Boolean(session))
    .filter((session) => session.status === 'completed');

  if (sessions.length === 0) return null;

  return sessions.reduce((latest, session) => {
    const latestTime = Date.parse(latest.completedAt || latest.updatedAt || latest.createdAt);
    const sessionTime = Date.parse(session.completedAt || session.updatedAt || session.createdAt);
    if (!Number.isFinite(latestTime)) return session;
    if (!Number.isFinite(sessionTime)) return latest;
    return sessionTime > latestTime ? session : latest;
  });
};

const buildStatusPayloadFromAccessState = (accessState: DesktopAccessState) => {
  const normalized = normalizeDesktopAccessState(accessState);
  const lastCompletedPurchase = getLastCompletedPurchase(normalized);
  const purchaseDate = normalizeIso(normalized.grantedAt) || normalizeIso(lastCompletedPurchase?.completedAt) || normalizeIso(lastCompletedPurchase?.updatedAt);
  const expiresAt = normalizeIso(normalized.expiresAt);
  const paymentProvider = normalizeProvider(normalized.activeProvider || lastCompletedPurchase?.provider);

  return {
    paymentCompleted: Boolean(purchaseDate),
    purchaseDate,
    expiresAt,
    paymentProvider,
  };
};

export const isDesktopUserStatusActive = (record: DesktopUserStatusRecord | null | undefined): boolean => {
  if (record?.isPriviledge) return true;
  if (!record?.paymentCompleted || !record.expiresAt) return false;
  const expiresAtTime = Date.parse(record.expiresAt);
  return Number.isFinite(expiresAtTime) && expiresAtTime > Date.now();
};

const toOverviewStatus = (record: {
  isPriviledge: boolean;
  paymentCompleted: boolean;
  expiresAt: string | null;
}): 'active' | 'expired' | 'not-purchased' | 'privileged' => {
  if (record.isPriviledge) return 'privileged';
  if (!record.paymentCompleted) return 'not-purchased';
  if (!record.expiresAt) return 'expired';
  const expiresAtTime = Date.parse(record.expiresAt);
  if (!Number.isFinite(expiresAtTime)) return 'expired';
  return expiresAtTime > Date.now() ? 'active' : 'expired';
};

const toOverview = (row: DesktopUsersOverviewRow): DesktopUserPurchaseOverview => {
  const statusSource = Array.isArray(row.user_desktop_status)
    ? row.user_desktop_status[0] || null
    : row.user_desktop_status;
  const paymentCompleted = Boolean(statusSource?.payment_completed);
  const expiresAt = normalizeIso(statusSource?.expires_at);

  return {
    username: normalizeUsername(row.username),
    email: typeof row.email === 'string' && row.email.trim() ? row.email.trim().toLowerCase() : null,
    isPriviledge: Boolean(row.is_priviledge),
    registeredAt: normalizeIso(row.created_at),
    paymentCompleted,
    purchaseDate: normalizeIso(statusSource?.purchase_date),
    expiresAt,
    paymentProvider: normalizeProvider(statusSource?.payment_provider),
    desktopStatus: toOverviewStatus({
      isPriviledge: Boolean(row.is_priviledge),
      paymentCompleted,
      expiresAt,
    }),
    updatedAt: normalizeIso(statusSource?.updated_at),
  };
};

export async function listDesktopUserPurchaseOverviews(): Promise<DesktopUserPurchaseOverview[]> {
  if (!isDesktopStatusDbConfigured()) return [];

  try {
    const client = getAdminClient();
    const fetchAuthUsersWithPrivilege = () =>
      client
        .from(AUTH_USERS_TABLE)
        .select(AUTH_USERS_OVERVIEW_SELECT)
        .order('created_at', { ascending: false })
        .returns<AuthUsersOverviewRow[]>();

    let authUsersResult = await fetchAuthUsersWithPrivilege();
    let authUsers = authUsersResult.data || [];

    if (authUsersResult.error && isMissingPrivilegeColumnError(authUsersResult.error)) {
      const legacyResult = await client
        .from(AUTH_USERS_TABLE)
        .select(AUTH_USERS_OVERVIEW_SELECT_LEGACY)
        .order('created_at', { ascending: false })
        .returns<LegacyAuthUsersOverviewRow[]>();

      if (legacyResult.error) {
        normalizeAuthUserTableError(legacyResult.error, 'Failed to read desktop purchase overview.');
      }

      authUsers = (legacyResult.data || []).map((row) => ({
        ...row,
        is_priviledge: false,
      }));
    } else if (authUsersResult.error) {
      normalizeAuthUserTableError(authUsersResult.error, 'Failed to read desktop purchase overview.');
    }

    const { data: statusRows, error: statusError } = await client
      .from(DESKTOP_STATUS_TABLE)
      .select('username, payment_completed, purchase_date, expires_at, payment_provider, updated_at')
      .returns<Pick<DesktopUserStatusRow, 'username' | 'payment_completed' | 'purchase_date' | 'expires_at' | 'payment_provider' | 'updated_at'>[]>();

    if (statusError) {
      withHelpfulTableError(statusError, 'Failed to read desktop purchase overview.');
    }

    const statusByUsername = new Map(
      (statusRows || []).map((row) => [normalizeUsername(row.username), row] as const)
    );

    return (authUsers || []).map((row) => {
      const statusRow = statusByUsername.get(normalizeUsername(row.username)) || null;
      return toOverview({
        ...row,
        user_desktop_status: statusRow
          ? {
              payment_completed: statusRow.payment_completed,
              purchase_date: statusRow.purchase_date,
              expires_at: statusRow.expires_at,
              payment_provider: statusRow.payment_provider,
              updated_at: statusRow.updated_at,
            }
          : null,
      });
    });
  } catch (error) {
    const message = describeDbError(error).toLowerCase();
    if (message.includes(DESKTOP_STATUS_TABLE)) {
      withHelpfulTableError(error, 'Failed to read desktop purchase overview.');
    }
    normalizeAuthUserTableError(error, 'Failed to read desktop purchase overview.');
  }
}

export async function readDesktopUserStatusFromDb(username: string): Promise<DesktopUserStatusRecord | null> {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) return null;

  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from(DESKTOP_STATUS_TABLE)
      .select('username, payment_completed, purchase_date, expires_at, payment_provider, created_at, updated_at, migrated_from_storage_at')
      .eq('username', normalizedUsername)
      .maybeSingle<DesktopUserStatusRow>();

    if (error) {
      withHelpfulTableError(error, 'Failed to read desktop status.');
    }

    return data ? toRecord(data) : null;
  } catch (error) {
    withHelpfulTableError(error, 'Failed to read desktop status.');
  }
}

export async function upsertDesktopUserStatus(payload: {
  username: string;
  paymentCompleted: boolean;
  purchaseDate?: string | null;
  expiresAt?: string | null;
  paymentProvider?: DesktopPaymentProvider | null;
  migratedFromStorageAt?: string | null;
}): Promise<DesktopUserStatusRecord> {
  const normalizedUsername = normalizeUsername(payload.username);
  const now = new Date().toISOString();

  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from(DESKTOP_STATUS_TABLE)
      .upsert(
        {
          username: normalizedUsername,
          payment_completed: payload.paymentCompleted,
          purchase_date: normalizeIso(payload.purchaseDate),
          expires_at: normalizeIso(payload.expiresAt),
          payment_provider: normalizeProvider(payload.paymentProvider),
          updated_at: now,
          migrated_from_storage_at: payload.migratedFromStorageAt ?? null,
        },
        { onConflict: 'username' }
      )
      .select('username, payment_completed, purchase_date, expires_at, payment_provider, created_at, updated_at, migrated_from_storage_at')
      .single<DesktopUserStatusRow>();

    if (error) {
      withHelpfulTableError(error, 'Failed to save desktop status.');
    }

    return toRecord(data);
  } catch (error) {
    withHelpfulTableError(error, 'Failed to save desktop status.');
  }
}

export async function upsertDesktopUserStatusFromAccessState(
  username: string,
  accessState: DesktopAccessState,
  options?: { migratedFromStorageAt?: string | null }
): Promise<DesktopUserStatusRecord | null> {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) return null;
  if (!isDesktopStatusDbConfigured()) return null;

  const payload = buildStatusPayloadFromAccessState(accessState);
  if (!payload.paymentCompleted && !payload.expiresAt && !payload.paymentProvider) {
    return null;
  }

  return await upsertDesktopUserStatus({
    username: normalizedUsername,
    ...payload,
    migratedFromStorageAt: options?.migratedFromStorageAt ?? null,
  });
}

export async function migrateLegacyDesktopUserStatusToDb(username: string): Promise<DesktopUserStatusRecord | null> {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) return null;
  if (!isDesktopStatusDbConfigured()) return null;

  const existing = await readDesktopUserStatusFromDb(normalizedUsername);
  if (existing) return existing;

  const legacy = await readJsonFromStorage<DesktopAccessState>(`desktop-access/${normalizedUsername}.json`);
  if (!legacy) return null;

  const migratedAt = new Date().toISOString();
  return await upsertDesktopUserStatusFromAccessState(normalizedUsername, legacy, {
    migratedFromStorageAt: migratedAt,
  });
}

export async function readDesktopUserStatus(username: string): Promise<DesktopUserStatusRecord | null> {
  if (!isDesktopStatusDbConfigured()) return null;
  const authUser = await readAuthUserByUsername(username);
  if (authUser?.isPriviledge) {
    const existing = await readDesktopUserStatusFromDb(username);
    return {
      username: authUser.username,
      isPriviledge: true,
      paymentCompleted: true,
      purchaseDate: existing?.purchaseDate || null,
      expiresAt: null,
      paymentProvider: existing?.paymentProvider || null,
      createdAt: existing?.createdAt || authUser.createdAt,
      updatedAt: existing?.updatedAt || authUser.updatedAt,
      migratedFromStorageAt: existing?.migratedFromStorageAt || authUser.migratedFromStorageAt,
    };
  }
  const existing = await readDesktopUserStatusFromDb(username);
  if (existing) return existing;
  return await migrateLegacyDesktopUserStatusToDb(username);
}

export async function assertDesktopAppLoginAllowed(username: string): Promise<DesktopUserStatusRecord> {
  const authUser = await readAuthUserByUsername(username);
  if (authUser?.isPriviledge) {
    return {
      username: authUser.username,
      isPriviledge: true,
      paymentCompleted: true,
      purchaseDate: null,
      expiresAt: null,
      paymentProvider: null,
      createdAt: authUser.createdAt,
      updatedAt: authUser.updatedAt,
      migratedFromStorageAt: authUser.migratedFromStorageAt,
    };
  }

  const record = await readDesktopUserStatus(username);
  if (!record || !record.paymentCompleted) {
    throw new Error('Desktop app is not purchased by this user. Buy desktop access first, then sign in again.');
  }
  if (!isDesktopUserStatusActive(record)) {
    throw new Error('Desktop access for this account is expired. Renew the yearly desktop plan to continue using the desktop app.');
  }
  return record;
}