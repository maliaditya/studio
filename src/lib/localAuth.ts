
"use client";

// IMPORTANT: Cloud auth records now live in Supabase Postgres via server routes.
// It keeps a local session token (the username) in localStorage.

import type { LocalUser } from '@/types/workout';
import { describeUnknownError } from '@/lib/errorMessage';
import { safeSetLocalStorageItem, safeSetSessionStorageItem } from '@/lib/safeStorage';

const CURRENT_USER_KEY = "currentUser"; // Stores username string of logged-in user
const CURRENT_USER_PROFILE_KEY = "currentUserProfile";
const ACTIVE_SESSION_KEY = "lifeos_active_session"; // Stores active session metadata
const TRUSTED_USERS_KEY = "lifeos_trusted_users_v1";
const DESKTOP_ENTITLEMENT_KEY_PREFIX = 'lifeos_desktop_entitlement_';
const REFRESH_TOKEN_KEY_PREFIX = "lifeos_refresh_token_";
const ACCESS_TOKEN_KEY_PREFIX = "lifeos_access_token_";
const TAB_ID_KEY = "lifeos_tab_id";
const SESSION_TTL_MS = 90 * 1000;
const TRUSTED_PASSWORD_ITERATIONS = 120000;
const AUTH_BASE_URL_WEB = process.env.NEXT_PUBLIC_AUTH_BASE_URL || "";

type ActiveSession = {
  username: string;
  sessionId: string;
  lastSeen: number;
  startedAt: number;
};

type TrustedUserRecord = {
  salt: string;
  hash: string;
  iterations: number;
  updatedAt: number;
};

type TrustedUsersMap = Record<string, TrustedUserRecord>;

type AuthApiSuccess = {
  success: boolean;
  message?: string;
  user?: { username: string; email?: string };
  desktopEntitlement?: { paymentCompleted: boolean; purchaseDate?: string | null; expiresAt?: string | null; isPriviledge?: boolean };
  accessToken?: string;
  accessTokenExpiresInSec?: number;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
};

type StoredCurrentUserProfile = {
  username: string;
  email?: string;
};

type DesktopEntitlementSnapshot = {
  username: string;
  isPriviledge: boolean;
  paymentCompleted: boolean;
  purchaseDate: string | null;
  expiresAt: string | null;
  updatedAt: number;
};

type AuthApiError = {
  error?: string;
  code?: string;
  message?: string;
};

const getTabId = () => {
  if (typeof window === 'undefined') return 'server';
  const existing = sessionStorage.getItem(TAB_ID_KEY);
  if (existing) return existing;
  const next = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  safeSetSessionStorageItem(TAB_ID_KEY, next);
  return next;
};

const readActiveSession = (): ActiveSession | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ActiveSession;
    if (!parsed?.username || !parsed?.sessionId) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeActiveSession = (session: ActiveSession) => {
  if (typeof window === 'undefined') return;
  safeSetLocalStorageItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
};

const isSessionStale = (session: ActiveSession) => Date.now() - session.lastSeen > SESSION_TTL_MS;
const normalizeUsername = (username: string) => username.trim().toLowerCase();

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const getCrypto = () => {
  if (typeof window === 'undefined') return null;
  return window.crypto || null;
};

const isDesktopRuntime = () => typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop);

const getDesktopTokenStore = () => {
  if (!isDesktopRuntime()) return null;
  const store = (window as any)?.studioDesktop?.authTokenStore;
  if (!store) return null;
  return store as {
    set: (username: string, refreshToken: string) => Promise<{ success: boolean; error?: string }>;
    get: (username: string) => Promise<{ success: boolean; token?: string | null; error?: string }>;
    clear: (username: string) => Promise<{ success: boolean; error?: string }>;
  };
};

const getDesktopAuthHttp = () => {
  if (!isDesktopRuntime()) return null;
  const bridge = (window as any)?.studioDesktop?.authHttp;
  if (!bridge?.request) return null;
  return bridge as {
    request: (payload: {
      url: string;
      method: string;
      headers?: Record<string, string>;
      body?: string;
    }) => Promise<{ success: boolean; ok?: boolean; status?: number; data?: unknown; text?: string; error?: string }>;
  };
};

const resolveAuthBaseUrl = (): string => {
  if (typeof window === "undefined") return AUTH_BASE_URL_WEB;
  if (isDesktopRuntime()) {
    const desktopBase = (window as any)?.studioDesktop?.authBaseUrl;
    if (typeof desktopBase === "string" && desktopBase.trim().length > 0) return desktopBase.trim();
  }
  return AUTH_BASE_URL_WEB.trim();
};

const buildAuthUrl = (path: string): string => {
  const base = resolveAuthBaseUrl();
  if (!base) return path;
  return new URL(path, base.endsWith("/") ? base : `${base}/`).toString();
};

const getDesktopEntitlementKey = (username: string) => `${DESKTOP_ENTITLEMENT_KEY_PREFIX}${normalizeUsername(username)}`;

export const readCachedDesktopEntitlementSnapshot = (username: string): DesktopEntitlementSnapshot | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(getDesktopEntitlementKey(username));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DesktopEntitlementSnapshot;
    if (!parsed?.username) return null;
    return {
      username: normalizeUsername(parsed.username),
      isPriviledge: Boolean((parsed as DesktopEntitlementSnapshot).isPriviledge),
      paymentCompleted: Boolean(parsed.paymentCompleted),
      purchaseDate: typeof parsed.purchaseDate === 'string' ? parsed.purchaseDate : null,
      expiresAt: typeof parsed.expiresAt === 'string' ? parsed.expiresAt : null,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
};

export const persistDesktopEntitlementSnapshot = (
  username: string,
  payload: { paymentCompleted: boolean; purchaseDate?: string | null; expiresAt?: string | null; isPriviledge?: boolean }
) => {
  if (typeof window === 'undefined') return;
  const normalizedUsername = normalizeUsername(username);
  safeSetLocalStorageItem(
    getDesktopEntitlementKey(normalizedUsername),
    JSON.stringify({
      username: normalizedUsername,
      isPriviledge: Boolean(payload.isPriviledge),
      paymentCompleted: Boolean(payload.paymentCompleted),
      purchaseDate: typeof payload.purchaseDate === 'string' ? payload.purchaseDate : null,
      expiresAt: typeof payload.expiresAt === 'string' ? payload.expiresAt : null,
      updatedAt: Date.now(),
    } satisfies DesktopEntitlementSnapshot)
  );
};

const persistDesktopEntitlementFromAuthResponse = (username: string, payload?: AuthApiSuccess) => {
  if (!payload?.desktopEntitlement) return;
  persistDesktopEntitlementSnapshot(username, {
    paymentCompleted: payload.desktopEntitlement.paymentCompleted,
    purchaseDate: payload.desktopEntitlement.purchaseDate ?? null,
    expiresAt: payload.desktopEntitlement.expiresAt ?? null,
    isPriviledge: Boolean(payload.desktopEntitlement.isPriviledge),
  });
};

const isDesktopEntitlementActive = (snapshot: DesktopEntitlementSnapshot | null): boolean => {
  if (!snapshot?.paymentCompleted || !snapshot.expiresAt) return false;
  const expiresAtTime = Date.parse(snapshot.expiresAt);
  return Number.isFinite(expiresAtTime) && expiresAtTime > Date.now();
};

export const hasValidCachedDesktopEntitlement = (snapshot: DesktopEntitlementSnapshot | null): boolean => {
  if (snapshot?.isPriviledge) return true;
  if (!snapshot?.paymentCompleted) return false;
  if (!snapshot.purchaseDate) return false;
  if (!snapshot.expiresAt) return false;
  const purchaseDateTime = Date.parse(snapshot.purchaseDate);
  const expiresAtTime = Date.parse(snapshot.expiresAt);
  if (!Number.isFinite(purchaseDateTime) || !Number.isFinite(expiresAtTime)) return false;
  if (expiresAtTime <= Date.now()) return false;
  return expiresAtTime > purchaseDateTime;
};

const requireDesktopEntitlementFromAuthPayload = (username: string, payload: AuthApiSuccess): DesktopEntitlementSnapshot => {
  if (payload?.desktopEntitlement?.isPriviledge) {
    return {
      username: normalizeUsername(username),
      isPriviledge: true,
      paymentCompleted: true,
      purchaseDate: null,
      expiresAt: null,
      updatedAt: Date.now(),
    };
  }

  if (!payload?.desktopEntitlement?.paymentCompleted) {
    throw new Error('Desktop app is not purchased by this user. Buy desktop access first, then sign in again.');
  }

  const snapshot: DesktopEntitlementSnapshot = {
    username: normalizeUsername(username),
    isPriviledge: false,
    paymentCompleted: Boolean(payload?.desktopEntitlement?.paymentCompleted),
    purchaseDate:
      typeof payload?.desktopEntitlement?.purchaseDate === 'string' ? payload.desktopEntitlement.purchaseDate : null,
    expiresAt:
      typeof payload?.desktopEntitlement?.expiresAt === 'string' ? payload.desktopEntitlement.expiresAt : null,
    updatedAt: Date.now(),
  };

  if (!hasValidCachedDesktopEntitlement(snapshot)) {
    throw new Error(
      'Desktop purchase data is incomplete on this device. Connect to the internet and complete one successful desktop sign-in after purchase to cache purchase validity.'
    );
  }

  return snapshot;
};

const authRequest = async <T = unknown>(
  path: string,
  init: { method: string; headers?: Record<string, string>; body?: string }
): Promise<{ ok: boolean; status: number; data: T | AuthApiError | null }> => {
  const url = buildAuthUrl(path);
  const base = resolveAuthBaseUrl();
  const shouldProxyViaDesktop = isDesktopRuntime() && Boolean(base) && typeof window !== "undefined" && !url.startsWith(window.location.origin);
  const headers = {
    ...(init.headers || {}),
    ...(isDesktopRuntime() ? { 'x-studio-desktop': '1' } : {}),
  };

  const performBrowserFetch = async (): Promise<{ ok: boolean; status: number; data: T | AuthApiError | null }> => {
    try {
      const response = await fetch(url, {
        method: init.method,
        headers,
        credentials: "include",
        body: init.body,
      });
      const data = (await response.json().catch(() => null)) as T | AuthApiError | null;
      return { ok: response.ok, status: response.status, data };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        data: { error: describeUnknownError(error, 'Request failed.') },
      };
    }
  };

  if (shouldProxyViaDesktop) {
    const proxy = getDesktopAuthHttp();
    if (!proxy) {
      return performBrowserFetch();
    }
    const result = await proxy.request({
      url,
      method: init.method,
      headers,
      body: init.body,
    });
    if (!result.success) {
      return performBrowserFetch();
    }
    return {
      ok: Boolean(result.ok),
      status: Number(result.status || 0),
      data: (result.data as T | AuthApiError | null) ?? null,
    };
  }

  return performBrowserFetch();
};

const setAccessToken = (username: string, accessToken?: string) => {
  if (typeof window === 'undefined') return;
  if (!accessToken) return;
  const key = `${ACCESS_TOKEN_KEY_PREFIX}${normalizeUsername(username)}`;
  safeSetLocalStorageItem(key, accessToken);
};

export const getAccessToken = (username: string): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`${ACCESS_TOKEN_KEY_PREFIX}${normalizeUsername(username)}`);
};

const clearAccessToken = (username: string) => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${ACCESS_TOKEN_KEY_PREFIX}${normalizeUsername(username)}`);
};

const storeRefreshToken = async (username: string, refreshToken?: string) => {
  if (!refreshToken || typeof window === 'undefined') return;
  const normalized = normalizeUsername(username);
  const desktopStore = getDesktopTokenStore();
  if (desktopStore) {
    const result = await desktopStore.set(normalized, refreshToken);
    if (!result?.success) {
      throw new Error(result?.error || 'Failed to persist desktop refresh token.');
    }
    return;
  }
  safeSetLocalStorageItem(`${REFRESH_TOKEN_KEY_PREFIX}${normalized}`, refreshToken);
};

const readRefreshToken = async (username: string): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  const normalized = normalizeUsername(username);
  const desktopStore = getDesktopTokenStore();
  if (desktopStore) {
    const result = await desktopStore.get(normalized);
    if (!result?.success) {
      throw new Error(result?.error || 'Failed to read desktop refresh token.');
    }
    return result.token || null;
  }
  return localStorage.getItem(`${REFRESH_TOKEN_KEY_PREFIX}${normalized}`);
};

const clearRefreshToken = async (username: string) => {
  if (typeof window === 'undefined') return;
  const normalized = normalizeUsername(username);
  const desktopStore = getDesktopTokenStore();
  if (desktopStore) {
    const result = await desktopStore.clear(normalized);
    if (!result?.success) {
      throw new Error(result?.error || 'Failed to clear desktop refresh token.');
    }
  } else {
    localStorage.removeItem(`${REFRESH_TOKEN_KEY_PREFIX}${normalized}`);
  }
};

const persistCurrentUserProfile = (user: LocalUser) => {
  if (typeof window === 'undefined') return;
  safeSetLocalStorageItem(CURRENT_USER_PROFILE_KEY, JSON.stringify(user));
};

export const persistCurrentLocalUserProfile = (user: LocalUser) => {
  persistCurrentUserProfile({
    username: normalizeUsername(user.username),
    ...(user.email ? { email: user.email } : {}),
  });
};

const readCurrentUserProfile = (username?: string): LocalUser | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(CURRENT_USER_PROFILE_KEY);
  if (!raw) return username ? { username } : null;
  try {
    const parsed = JSON.parse(raw) as StoredCurrentUserProfile;
    if (!parsed?.username) return username ? { username } : null;
    if (username && normalizeUsername(parsed.username) !== normalizeUsername(username)) {
      return { username };
    }
    return {
      username: normalizeUsername(parsed.username),
      ...(parsed.email ? { email: parsed.email } : {}),
    };
  } catch {
    return username ? { username } : null;
  }
};

const clearCurrentUserProfile = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CURRENT_USER_PROFILE_KEY);
};

const persistAuthTokens = async (username: string, payload: AuthApiSuccess) => {
  if (!payload) return;
  if (payload.accessToken) setAccessToken(username, payload.accessToken);
  if (payload.refreshToken) {
    await storeRefreshToken(username, payload.refreshToken);
  }
};

const readTrustedUsers = (): TrustedUsersMap => {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(TRUSTED_USERS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as TrustedUsersMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeTrustedUsers = (users: TrustedUsersMap) => {
  if (typeof window === 'undefined') return;
  safeSetLocalStorageItem(TRUSTED_USERS_KEY, JSON.stringify(users));
};

const hashPasswordForOffline = async (password: string, salt: Uint8Array, iterations = TRUSTED_PASSWORD_ITERATIONS): Promise<string> => {
  const cryptoApi = getCrypto();
  if (!cryptoApi?.subtle) throw new Error('Crypto API unavailable.');
  const keyMaterial = await cryptoApi.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await cryptoApi.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bytesToBase64(new Uint8Array(bits));
};

const cacheTrustedCredentials = async (username: string, password: string): Promise<void> => {
  if (typeof window === 'undefined') return;
  const cryptoApi = getCrypto();
  if (!cryptoApi) return;
  const normalized = normalizeUsername(username);
  if (!normalized || !password) return;

  const salt = cryptoApi.getRandomValues(new Uint8Array(16));
  const hash = await hashPasswordForOffline(password, salt, TRUSTED_PASSWORD_ITERATIONS);
  const trustedUsers = readTrustedUsers();
  trustedUsers[normalized] = {
    salt: bytesToBase64(salt),
    hash,
    iterations: TRUSTED_PASSWORD_ITERATIONS,
    updatedAt: Date.now(),
  };
  writeTrustedUsers(trustedUsers);
};

const verifyTrustedCredentials = async (username: string, password: string): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  const normalized = normalizeUsername(username);
  const trustedUsers = readTrustedUsers();
  const record = trustedUsers[normalized];
  if (!record || !password) return false;

  try {
    const salt = base64ToBytes(record.salt);
    const computed = await hashPasswordForOffline(password, salt, record.iterations || TRUSTED_PASSWORD_ITERATIONS);
    return computed === record.hash;
  } catch {
    return false;
  }
};

export const hasActiveSessionConflict = (username: string): boolean => {
  if (typeof window === 'undefined') return false;
  const active = readActiveSession();
  if (!active) return false;
  if (active.username !== username) return false;
  if (isSessionStale(active)) return false;
  return active.sessionId !== getTabId();
};

export const establishSession = (username: string) => {
  if (typeof window === 'undefined') return;
  const sessionId = getTabId();
  const existing = readActiveSession();
  const startedAt = existing?.username === username ? existing.startedAt : Date.now();
  writeActiveSession({ username, sessionId, lastSeen: Date.now(), startedAt });
};

export const refreshSessionHeartbeat = (username: string) => {
  if (typeof window === 'undefined') return;
  const sessionId = getTabId();
  const active = readActiveSession();
  if (!active || active.username !== username) {
    establishSession(username);
    return;
  }
  if (active.sessionId !== sessionId && !isSessionStale(active)) {
    return;
  }
  writeActiveSession({ ...active, sessionId, lastSeen: Date.now() });
};

export const clearSessionIfOwned = (username?: string) => {
  if (typeof window === 'undefined') return;
  const active = readActiveSession();
  if (!active) return;
  if (active.sessionId !== getTabId()) return;
  if (username && active.username !== username) return;
  localStorage.removeItem(ACTIVE_SESSION_KEY);
};

export const isCurrentSessionOwner = (username: string): boolean => {
  if (typeof window === 'undefined') return false;
  const active = readActiveSession();
  if (!active) return false;
  if (active.username !== username) return false;
  if (isSessionStale(active)) return false;
  return active.sessionId === getTabId();
};

export async function registerUser(username: string, password: string, email: string): Promise<{ success: boolean, message: string, user?: LocalUser }> {
  const normalizedUsername = normalizeUsername(username);
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const response = await authRequest<AuthApiSuccess>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: normalizedUsername, password, email: normalizedEmail }),
    });

    const result = (response.data || {}) as ({ error?: string; code?: string; message?: string } & AuthApiSuccess);

    if (!response.ok) {
      if (result?.code === 'CLOUD_AUTH_UNAVAILABLE') {
        return { success: false, message: result.error || 'Cloud authentication is not configured for first-time registration.' };
      }
      if (result?.code === 'CLOUD_AUTH_SUSPENDED') {
        return { success: false, message: result.error || 'Cloud registration is temporarily unavailable. Please try again later or contact support.' };
      }
      return { success: false, message: result?.error || 'Registration failed.' };
    }
    
    // On successful registration, automatically log the user in locally
    const user: LocalUser = { username: normalizedUsername, email: result.user?.email || normalizedEmail };
    if (typeof window !== 'undefined') {
      await cacheTrustedCredentials(normalizedUsername, password);
      await persistAuthTokens(normalizedUsername, result);
      safeSetLocalStorageItem(CURRENT_USER_KEY, normalizedUsername);
      persistCurrentUserProfile(user);
      establishSession(normalizedUsername);
    }
    return { success: true, message: result?.message || 'Registration successful.', user };

  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, message: "Unable to reach cloud authentication for first-time registration." };
  }
}

export async function loginUser(
  username: string,
  password: string,
  opts?: { force?: boolean }
): Promise<{ success: boolean, message: string, user?: LocalUser, code?: "SESSION_ACTIVE" }> {
  const normalizedUsername = normalizeUsername(username);
  const isDemoLogin = normalizedUsername === "demo" && password === "demo";
  const desktopRuntime = isDesktopRuntime();

  const finalizeOfflineLogin = async (): Promise<{ success: boolean, message: string, user?: LocalUser, code?: "SESSION_ACTIVE" }> => {
    if (isDemoLogin) {
      const user: LocalUser = readCurrentUserProfile(normalizedUsername) || { username: normalizedUsername };
      if (typeof window !== "undefined") {
        safeSetLocalStorageItem(CURRENT_USER_KEY, normalizedUsername);
        persistCurrentUserProfile(user);
        establishSession(normalizedUsername);
      }
      return {
        success: true,
        message: "Demo login successful.",
        user,
      };
    }
    if (desktopRuntime) {
      const desktopEntitlement = readCachedDesktopEntitlementSnapshot(normalizedUsername);
      if (!hasValidCachedDesktopEntitlement(desktopEntitlement)) {
        return {
          success: false,
          message:
            'Desktop purchase is not cached on this device or is expired. Connect to the internet and complete one successful desktop sign-in after purchase to refresh local purchase validity.',
        };
      }
    }
    const isTrusted = await verifyTrustedCredentials(normalizedUsername, password);
    if (!isTrusted) {
      return {
        success: false,
        message:
          "First login on this device requires a successful cloud authentication. Offline login is only available after one successful cloud login.",
      };
    }
    if (!opts?.force && hasActiveSessionConflict(normalizedUsername)) {
      return {
        success: false,
        code: "SESSION_ACTIVE",
        message: "This account is already open in another session. Please log out there first.",
      };
    }
    const user: LocalUser = readCurrentUserProfile(normalizedUsername) || { username: normalizedUsername };
    if (typeof window !== 'undefined') {
      safeSetLocalStorageItem(CURRENT_USER_KEY, normalizedUsername);
      persistCurrentUserProfile(user);
      establishSession(normalizedUsername);
    }
    return {
      success: true,
      message: "Offline resume successful. You're using trusted local credentials.",
      user,
    };
  };

  try {
    const response = await authRequest<AuthApiSuccess>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: normalizedUsername, password }),
    });

    const result = (response.data || {}) as ({ error?: string; code?: string; message?: string } & AuthApiSuccess);

    if (!response.ok) {
      if (result?.code === 'CLOUD_AUTH_UNAVAILABLE' && desktopRuntime) {
        return await finalizeOfflineLogin();
      }
      // Only the desktop app supports trusted offline resume after a prior cloud login.
      if (desktopRuntime && response.status >= 500) {
        return await finalizeOfflineLogin();
      }
      return { success: false, message: result?.error || 'Login failed.' };
    }

    if (!opts?.force && hasActiveSessionConflict(normalizedUsername)) {
      return { success: false, code: "SESSION_ACTIVE", message: "This account is already open in another session. Please log out there first." };
    }

    if (desktopRuntime) {
      try {
        requireDesktopEntitlementFromAuthPayload(normalizedUsername, result);
      } catch (error) {
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Desktop purchase validation is unavailable for this account.',
        };
      }
    }

        const user: LocalUser = {
          username: result.user?.username || normalizedUsername,
          ...(result.user?.email ? { email: result.user.email } : {}),
        };
    if (typeof window !== 'undefined') {
      await cacheTrustedCredentials(normalizedUsername, password);
      await persistAuthTokens(normalizedUsername, result);
      persistDesktopEntitlementFromAuthResponse(normalizedUsername, result);
      safeSetLocalStorageItem(CURRENT_USER_KEY, normalizedUsername);
      persistCurrentUserProfile(user);
      establishSession(normalizedUsername);
    }
    
    return { success: true, message: result?.message || 'Login successful.', user };
    
  } catch (error) {
    console.error("Login error (trying offline fallback):", error);
    const message = describeUnknownError(error, 'Cloud sign-in failed. Please try again.');
    if (message.toLowerCase().includes('refresh token')) {
      return {
        success: false,
        message: `${message} Cloud sign-in could not be completed on this device.`,
      };
    }
    if (desktopRuntime) {
      return await finalizeOfflineLogin();
    }
    return {
      success: false,
      message: message || 'Cloud sign-in failed. Please try again.',
    };
  }
}

export function logoutUser(): Promise<void> {
  return new Promise(async (resolve) => {
    if (typeof window !== 'undefined') {
      try {
        const username = localStorage.getItem(CURRENT_USER_KEY) || '';
        const refreshToken = username ? await readRefreshToken(username) : null;
        await authRequest('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Non-blocking: local sign-out should still proceed.
      }
      const username = localStorage.getItem(CURRENT_USER_KEY) || '';
      if (username) {
        await clearRefreshToken(username);
        clearAccessToken(username);
      }
      clearSessionIfOwned();
      localStorage.removeItem(CURRENT_USER_KEY);
      clearCurrentUserProfile();
    }
    resolve();
  });
}

export async function refreshSessionFromStoredToken(username: string): Promise<{ success: boolean; message: string; user?: LocalUser }> {
  const normalized = normalizeUsername(username);
  let refreshToken: string | null = null;
  try {
    refreshToken = await readRefreshToken(normalized);
  } catch (error) {
    return { success: false, message: describeUnknownError(error, 'Failed to read refresh token.') };
  }
  if (!refreshToken) {
    return { success: false, message: "No stored refresh token for this user." };
  }
  try {
    const response = await authRequest<AuthApiSuccess>('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const result = (response.data || {}) as AuthApiSuccess & { error?: unknown };
    if (!response.ok || !result.success) {
      return { success: false, message: describeUnknownError(result.error, 'Refresh failed.') };
    }

    if (isDesktopRuntime()) {
      try {
        requireDesktopEntitlementFromAuthPayload(normalized, result);
      } catch (error) {
        await clearRefreshToken(normalized).catch(() => undefined);
        clearAccessToken(normalized);
        clearSessionIfOwned(normalized);
        localStorage.removeItem(CURRENT_USER_KEY);
        clearCurrentUserProfile();
        return {
          success: false,
          message: describeUnknownError(error, 'Desktop purchase validation is unavailable for this account.'),
        };
      }
    }

    await persistAuthTokens(normalized, result);
    persistDesktopEntitlementFromAuthResponse(normalized, result);
    const user: LocalUser = {
      username: result.user?.username || normalized,
      ...(result.user?.email ? { email: result.user.email } : {}),
    };
    safeSetLocalStorageItem(CURRENT_USER_KEY, normalized);
    persistCurrentUserProfile(user);
    establishSession(normalized);
    return { success: true, message: 'Session refreshed.', user };
  } catch (error) {
    return { success: false, message: describeUnknownError(error, 'Refresh failed.') };
  }
}

export function getCurrentLocalUser(): LocalUser | null {
  if (typeof window !== 'undefined') {
    const username = localStorage.getItem(CURRENT_USER_KEY);
    if (!username) return null;

    if (isDesktopRuntime()) {
      const desktopEntitlement = readCachedDesktopEntitlementSnapshot(username);
      if (!hasValidCachedDesktopEntitlement(desktopEntitlement)) {
        clearSessionIfOwned(username);
        localStorage.removeItem(CURRENT_USER_KEY);
        clearCurrentUserProfile();
        clearAccessToken(username);
        const desktopStore = getDesktopTokenStore();
        if (desktopStore) {
          void desktopStore.clear(normalizeUsername(username));
        } else {
          localStorage.removeItem(`${REFRESH_TOKEN_KEY_PREFIX}${normalizeUsername(username)}`);
        }
        return null;
      }
    }

    if (hasActiveSessionConflict(username)) {
      return null;
    }

    const active = readActiveSession();
    if (!active || isSessionStale(active) || active.username !== username) {
      establishSession(username);
    }

    return readCurrentUserProfile(username) || { username };
  }
  return null;
}
