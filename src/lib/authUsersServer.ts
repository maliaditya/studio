import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { hashPassword, type PasswordRecord } from '@/lib/password';
import { readJsonFromStorage } from '@/lib/supabaseStorageServer';

const AUTH_USERS_TABLE = 'auth_users';
const AUTH_USER_SELECT = 'username, email, is_priviledge, password_hash, password_salt, password_algo, created_at, updated_at, migrated_from_storage_at';
const AUTH_USER_SELECT_LEGACY = 'username, email, password_hash, password_salt, password_algo, created_at, updated_at, migrated_from_storage_at';

export type AuthUserRecord = {
  username: string;
  email: string | null;
  isPriviledge: boolean;
  passwordHash: string;
  passwordSalt: string;
  passwordAlgo: string;
  createdAt: string;
  updatedAt: string;
  migratedFromStorageAt: string | null;
};

type AuthUserRow = {
  username: string;
  email: string | null;
  is_priviledge: boolean | null;
  password_hash: string;
  password_salt: string;
  password_algo: string;
  created_at: string;
  updated_at: string;
  migrated_from_storage_at: string | null;
};

type LegacyAuthUserRow = Omit<AuthUserRow, 'is_priviledge'>;

type LegacyAuthRecord = Partial<PasswordRecord> & {
  email?: string;
  createdAt?: string;
  password?: string;
};

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

const getSupabaseUrl = () => process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const getServiceRoleKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const normalizeUsername = (username: string) => String(username || '').trim().toLowerCase();
const normalizeEmail = (email?: string | null) => {
  const normalized = String(email || '').trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const describeDbError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message || String(error);
  }
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const parts = [record.message, record.details, record.hint, record.code]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' | ');
    }
    try {
      return JSON.stringify(record);
    } catch {
      return String(record);
    }
  }
  return String(error || '');
};

const toRecord = (row: Pick<AuthUserRow, 'username' | 'email' | 'password_hash' | 'password_salt' | 'password_algo' | 'created_at' | 'updated_at' | 'migrated_from_storage_at'> & { is_priviledge?: boolean | null }): AuthUserRecord => ({
  username: normalizeUsername(row.username),
  email: normalizeEmail(row.email),
  isPriviledge: Boolean(row.is_priviledge),
  passwordHash: row.password_hash,
  passwordSalt: row.password_salt,
  passwordAlgo: row.password_algo,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  migratedFromStorageAt: row.migrated_from_storage_at,
});

const isMissingPrivilegeColumnError = (error: unknown): boolean => {
  const message = describeDbError(error);
  const lower = message.toLowerCase();
  return lower.includes('is_priviledge') && (lower.includes('column') || lower.includes('schema cache'));
};

async function ensureAuthPrivilegeColumn(client: SupabaseClient): Promise<void> {
  const { error } = await client.from(AUTH_USERS_TABLE).select('is_priviledge').limit(1);
  if (!error) return;
  if (isMissingPrivilegeColumnError(error)) {
    throw new Error('Auth database is missing auth_users.is_priviledge. Run docs/auth-users.sql in Supabase SQL Editor to add the column.');
  }
  withHelpfulTableError(error, 'Failed to verify auth user privilege schema.');
}

async function selectAuthUserByUsername(
  client: SupabaseClient,
  username: string
): Promise<AuthUserRecord | null> {
  const { data, error } = await client
    .from(AUTH_USERS_TABLE)
    .select(AUTH_USER_SELECT)
    .eq('username', username)
    .maybeSingle<AuthUserRow>();

  if (!error) {
    return data ? toRecord(data) : null;
  }

  if (!isMissingPrivilegeColumnError(error)) {
    withHelpfulTableError(error, 'Failed to read auth user.');
  }

  const legacyResult = await client
    .from(AUTH_USERS_TABLE)
    .select(AUTH_USER_SELECT_LEGACY)
    .eq('username', username)
    .maybeSingle<LegacyAuthUserRow>();

  if (legacyResult.error) {
    withHelpfulTableError(legacyResult.error, 'Failed to read auth user.');
  }

  return legacyResult.data ? toRecord({ ...legacyResult.data, is_priviledge: false }) : null;
}

async function insertAuthUser(
  client: SupabaseClient,
  values: Omit<AuthUserRow, 'created_at' | 'updated_at' | 'migrated_from_storage_at'> & {
    created_at: string;
    updated_at: string;
    migrated_from_storage_at: string | null;
  },
  fallbackMessage: string
): Promise<AuthUserRecord> {
  const insertWithPrivilege = async () =>
    client
      .from(AUTH_USERS_TABLE)
      .insert(values)
      .select(AUTH_USER_SELECT)
      .single<AuthUserRow>();

  let result = await insertWithPrivilege();
  if (result.error && isMissingPrivilegeColumnError(result.error)) {
    const { is_priviledge: _ignored, ...legacyValues } = values;
    result = await client
      .from(AUTH_USERS_TABLE)
      .insert(legacyValues)
      .select(AUTH_USER_SELECT_LEGACY)
      .single<LegacyAuthUserRow>() as typeof result;
    if (!result.error && result.data) {
      return toRecord({ ...(result.data as LegacyAuthUserRow), is_priviledge: false });
    }
  }

  if (result.error) {
    withHelpfulTableError(result.error, fallbackMessage);
  }

  return toRecord(result.data);
}

async function upsertAuthUser(
  client: SupabaseClient,
  values: Omit<AuthUserRow, 'created_at' | 'updated_at' | 'migrated_from_storage_at'> & {
    created_at: string;
    updated_at: string;
    migrated_from_storage_at: string | null;
  },
  fallbackMessage: string
): Promise<AuthUserRecord> {
  const upsertWithPrivilege = async () =>
    client
      .from(AUTH_USERS_TABLE)
      .upsert(values, { onConflict: 'username' })
      .select(AUTH_USER_SELECT)
      .single<AuthUserRow>();

  let result = await upsertWithPrivilege();
  if (result.error && isMissingPrivilegeColumnError(result.error)) {
    const { is_priviledge: _ignored, ...legacyValues } = values;
    result = await client
      .from(AUTH_USERS_TABLE)
      .upsert(legacyValues, { onConflict: 'username' })
      .select(AUTH_USER_SELECT_LEGACY)
      .single<LegacyAuthUserRow>() as typeof result;
    if (!result.error && result.data) {
      return toRecord({ ...(result.data as LegacyAuthUserRow), is_priviledge: false });
    }
  }

  if (result.error) {
    withHelpfulTableError(result.error, fallbackMessage);
  }

  return toRecord(result.data);
}

async function updateAuthUserRow(
  client: SupabaseClient,
  username: string,
  values: Partial<AuthUserRow>,
  fallbackMessage: string
): Promise<AuthUserRecord> {
  const updateWithPrivilege = async () =>
    client
      .from(AUTH_USERS_TABLE)
      .update(values)
      .eq('username', username)
      .select(AUTH_USER_SELECT)
      .single<AuthUserRow>();

  let result = await updateWithPrivilege();
  if (result.error && isMissingPrivilegeColumnError(result.error)) {
    const { is_priviledge: _ignored, ...legacyValues } = values;
    result = await client
      .from(AUTH_USERS_TABLE)
      .update(legacyValues)
      .eq('username', username)
      .select(AUTH_USER_SELECT_LEGACY)
      .single<LegacyAuthUserRow>() as typeof result;
    if (!result.error && result.data) {
      return toRecord({ ...(result.data as LegacyAuthUserRow), is_priviledge: false });
    }
  }

  if (result.error) {
    withHelpfulTableError(result.error, fallbackMessage);
  }

  return toRecord(result.data);
}

const withHelpfulTableError = (error: unknown, fallbackMessage: string): never => {
  const message = describeDbError(error);
  const lower = message.toLowerCase();
  if (lower.includes('relation') && lower.includes(AUTH_USERS_TABLE)) {
    throw new Error(`Auth database table is missing. Run docs/auth-users.sql in Supabase SQL Editor before using cloud auth.`);
  }
  if (lower.includes('could not find the table') && lower.includes(AUTH_USERS_TABLE)) {
    throw new Error(`Auth database table is missing. Run docs/auth-users.sql in Supabase SQL Editor before using cloud auth.`);
  }
  throw new Error(message || fallbackMessage);
};

export const isAuthDbConfigured = (): boolean => Boolean(getSupabaseUrl().trim() && getServiceRoleKey().trim());

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

export async function readAuthUserFromDbByUsername(username: string): Promise<AuthUserRecord | null> {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) return null;

  try {
    const client = getAdminClient();
    return await selectAuthUserByUsername(client, normalizedUsername);
  } catch (error) {
    withHelpfulTableError(error, 'Failed to read auth user.');
  }
}

export async function createAuthUser(payload: {
  username: string;
  email?: string | null;
  password: PasswordRecord;
  createdAt?: string;
}): Promise<AuthUserRecord> {
  const normalizedUsername = normalizeUsername(payload.username);
  const now = new Date().toISOString();

  try {
    const client = getAdminClient();
    return await insertAuthUser(
      client,
      {
        username: normalizedUsername,
        email: normalizeEmail(payload.email),
        is_priviledge: false,
        password_hash: payload.password.passwordHash,
        password_salt: payload.password.passwordSalt,
        password_algo: payload.password.passwordAlgo,
        created_at: payload.createdAt || now,
        updated_at: now,
        migrated_from_storage_at: null,
      },
      'Failed to create auth user.'
    );
  } catch (error) {
    withHelpfulTableError(error, 'Failed to create auth user.');
  }
}

async function upsertMigratedAuthUser(payload: {
  username: string;
  email?: string | null;
  password: PasswordRecord;
  createdAt?: string;
}): Promise<AuthUserRecord> {
  const normalizedUsername = normalizeUsername(payload.username);
  const now = new Date().toISOString();

  try {
    const client = getAdminClient();
    return await upsertAuthUser(
      client,
      {
        username: normalizedUsername,
        email: normalizeEmail(payload.email),
        is_priviledge: false,
        password_hash: payload.password.passwordHash,
        password_salt: payload.password.passwordSalt,
        password_algo: payload.password.passwordAlgo,
        created_at: payload.createdAt || now,
        updated_at: now,
        migrated_from_storage_at: now,
      },
      'Failed to migrate auth user.'
    );
  } catch (error) {
    withHelpfulTableError(error, 'Failed to migrate auth user.');
  }
}

export async function migrateLegacyAuthUserToDb(username: string): Promise<AuthUserRecord | null> {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) return null;

  const existing = await readAuthUserFromDbByUsername(normalizedUsername);
  if (existing) return existing;

  const legacy = await readJsonFromStorage<LegacyAuthRecord>(`auth/${normalizedUsername}.json`);
  if (!legacy) return null;

  const hasHashedPassword =
    typeof legacy.passwordHash === 'string' &&
    typeof legacy.passwordSalt === 'string' &&
    typeof legacy.passwordAlgo === 'string';

  const passwordRecord = hasHashedPassword
    ? {
        passwordHash: legacy.passwordHash!,
        passwordSalt: legacy.passwordSalt!,
        passwordAlgo: legacy.passwordAlgo!,
      }
    : typeof legacy.password === 'string'
    ? hashPassword(legacy.password)
    : null;

  if (!passwordRecord) {
    throw new Error(`Legacy auth record for ${normalizedUsername} is missing a usable password.`);
  }

  return await upsertMigratedAuthUser({
    username: normalizedUsername,
    email: legacy.email,
    password: passwordRecord,
    createdAt: typeof legacy.createdAt === 'string' && legacy.createdAt.trim() ? legacy.createdAt : new Date().toISOString(),
  });
}

export async function readAuthUserByUsername(username: string): Promise<AuthUserRecord | null> {
  const existing = await readAuthUserFromDbByUsername(username);
  if (existing) return existing;
  return await migrateLegacyAuthUserToDb(username);
}

export async function updateAuthUser(payload: {
  username: string;
  email?: string | null;
  password?: PasswordRecord | null;
}): Promise<AuthUserRecord> {
  const normalizedUsername = normalizeUsername(payload.username);
  const now = new Date().toISOString();
  const existing = await readAuthUserFromDbByUsername(normalizedUsername);

  if (!existing) {
    throw new Error(`Auth user ${normalizedUsername} was not found.`);
  }

  try {
    const client = getAdminClient();
    return await updateAuthUserRow(
      client,
      normalizedUsername,
      {
        email: normalizeEmail(payload.email ?? existing.email),
        is_priviledge: existing.isPriviledge,
        password_hash: payload.password?.passwordHash || existing.passwordHash,
        password_salt: payload.password?.passwordSalt || existing.passwordSalt,
        password_algo: payload.password?.passwordAlgo || existing.passwordAlgo,
        updated_at: now,
      },
      'Failed to update auth user.'
    );
  } catch (error) {
    withHelpfulTableError(error, 'Failed to update auth user.');
  }
}

export async function updateAuthUserPrivilege(payload: {
  username: string;
  isPriviledge: boolean;
}): Promise<AuthUserRecord> {
  const normalizedUsername = normalizeUsername(payload.username);
  const now = new Date().toISOString();

  try {
    const client = getAdminClient();
    await ensureAuthPrivilegeColumn(client);
    return await updateAuthUserRow(
      client,
      normalizedUsername,
      {
        is_priviledge: Boolean(payload.isPriviledge),
        updated_at: now,
      },
      'Failed to update auth user privilege.'
    );
  } catch (error) {
    withHelpfulTableError(error, 'Failed to update auth user privilege.');
  }
}