import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import {
  createEmptyDesktopAccessState,
  DESKTOP_PLAN_BILLING_LABEL,
  DESKTOP_PLAN_CURRENCY,
  DESKTOP_PLAN_DURATION_DAYS,
  DESKTOP_PLAN_PRICE_INR,
  normalizeDesktopAccessState,
  type DesktopAccessState,
  type DesktopPaymentProvider,
} from '@/lib/desktopAccess';
import { isDesktopUserStatusActive, readDesktopUserStatus } from '@/lib/desktopStatusServer';
import { isSupabaseStorageConfigured, readJsonFromStorage, writeJsonToStorage } from '@/lib/supabaseStorageServer';
import { getSessionUserFromRequest } from '@/lib/serverSession';

const normalizeUsername = (username: string) => username.trim().toLowerCase();
const accessPathForUser = (username: string) => `desktop-access/${normalizeUsername(username)}.json`;
const localCookieName = (username: string) =>
  `lifeos_desktop_access_${normalizeUsername(username).replace(/[^a-z0-9_-]/g, '_')}`;
const allowLocalUserFallback = process.env.NODE_ENV !== 'production';

const readCookie = (request: Request, cookieName: string): string | null => {
  const cookieHeader = request.headers.get('cookie') || '';
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [name, ...rest] = part.trim().split('=');
    if (name !== cookieName) continue;
    return decodeURIComponent(rest.join('='));
  }
  return null;
};

const readLocalUsernameHint = (request: Request): string | null => {
  const headerValue = request.headers.get('x-local-username') || request.headers.get('x-lifeos-local-user');
  if (typeof headerValue === 'string' && headerValue.trim()) {
    return normalizeUsername(headerValue);
  }

  const url = new URL(request.url);
  const queryValue = url.searchParams.get('username');
  if (typeof queryValue === 'string' && queryValue.trim()) {
    return normalizeUsername(queryValue);
  }

  return null;
};

export const resolveDesktopAccessUser = (request: Request, explicitUsername?: string | null): string | null => {
  const sessionUser = getSessionUserFromRequest(request);
  if (sessionUser) return sessionUser;

  if (!isSupabaseStorageConfigured() || allowLocalUserFallback) {
    const explicit = typeof explicitUsername === 'string' && explicitUsername.trim()
      ? normalizeUsername(explicitUsername)
      : null;
    return explicit || readLocalUsernameHint(request);
  }

  return null;
};

export const readDesktopAccessState = async (request: Request, username: string): Promise<DesktopAccessState> => {
  const normalizedUsername = normalizeUsername(username);
  let accessState = createEmptyDesktopAccessState();

  if (isSupabaseStorageConfigured()) {
    try {
      const raw = await readJsonFromStorage<DesktopAccessState>(accessPathForUser(normalizedUsername));
      accessState = normalizeDesktopAccessState(raw);
    } catch (error: any) {
      if (error?.status === 404 || error?.message?.includes('404')) {
        accessState = createEmptyDesktopAccessState();
      } else if (allowLocalUserFallback) {
        const rawCookie = readCookie(request, localCookieName(normalizedUsername));
        if (!rawCookie) {
          accessState = createEmptyDesktopAccessState();
        } else {
          try {
            accessState = normalizeDesktopAccessState(JSON.parse(rawCookie));
          } catch {
            accessState = createEmptyDesktopAccessState();
          }
        }
      } else {
        throw error;
      }
    }
  } else {
    const rawCookie = readCookie(request, localCookieName(normalizedUsername));
    if (!rawCookie) {
      accessState = createEmptyDesktopAccessState();
    } else {
      try {
        accessState = normalizeDesktopAccessState(JSON.parse(rawCookie));
      } catch {
        accessState = createEmptyDesktopAccessState();
      }
    }
  }

  const desktopStatus = await readDesktopUserStatus(normalizedUsername);
  if (!desktopStatus) {
    return accessState;
  }

  return normalizeDesktopAccessState({
    ...accessState,
    hasAccess: isDesktopUserStatusActive(desktopStatus),
    status: isDesktopUserStatusActive(desktopStatus)
      ? 'active'
      : accessState.currentSession?.status === 'pending'
      ? 'pending'
      : 'locked',
    activeProvider: desktopStatus.paymentProvider || accessState.activeProvider,
    grantedAt: desktopStatus.purchaseDate || accessState.grantedAt,
    expiresAt: desktopStatus.expiresAt || accessState.expiresAt,
    updatedAt: desktopStatus.updatedAt || accessState.updatedAt,
  });
};

export const writeDesktopAccessState = async (
  username: string,
  accessState: DesktopAccessState,
  response: NextResponse
): Promise<void> => {
  const normalizedUsername = normalizeUsername(username);
  const normalizedState = normalizeDesktopAccessState(accessState);

  if (isSupabaseStorageConfigured()) {
    try {
      await writeJsonToStorage(accessPathForUser(normalizedUsername), normalizedState);
      return;
    } catch (error) {
      if (!allowLocalUserFallback) {
        throw error;
      }
    }
  }

  response.cookies.set({
    name: localCookieName(normalizedUsername),
    value: encodeURIComponent(JSON.stringify(normalizedState)),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 400,
  });
};

const getPlanExpiryIso = (fromIso: string): string => {
  const next = new Date(fromIso);
  next.setFullYear(next.getFullYear() + 1);
  return next.toISOString();
};

export const createDesktopCheckoutState = (
  current: DesktopAccessState,
  provider: DesktopPaymentProvider,
  amountInr = DESKTOP_PLAN_PRICE_INR
): DesktopAccessState => {
  const now = new Date().toISOString();
  const previousHistory = current.currentSession ? [...current.history, current.currentSession] : [...current.history];

  return normalizeDesktopAccessState({
    ...current,
    hasAccess: false,
    status: 'pending',
    activeProvider: provider,
    updatedAt: now,
    currentSession: {
      id: randomUUID(),
      provider,
      providerSessionId: null,
      status: 'pending',
      amountUsd: amountInr,
      currency: DESKTOP_PLAN_CURRENCY,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      note: `Checkout session created for ${provider}.`,
    },
    history: previousHistory,
  });
};

export const completeDesktopCheckoutState = (
  current: DesktopAccessState,
  sessionId: string
): DesktopAccessState => {
  if (!current.currentSession || current.currentSession.id !== sessionId) {
    throw new Error('Checkout session was not found. Start a new desktop payment session.');
  }
  if (current.currentSession.status !== 'pending') {
    throw new Error('Checkout session is no longer pending.');
  }

  const now = new Date().toISOString();
  const expiresAt = getPlanExpiryIso(now);
  const completedSession = {
    ...current.currentSession,
    status: 'completed' as const,
    updatedAt: now,
    completedAt: now,
    note: `${current.currentSession.provider} payment confirmed. Desktop access unlocked for one ${DESKTOP_PLAN_BILLING_LABEL} term.`,
  };

  return normalizeDesktopAccessState({
    ...current,
    hasAccess: true,
    status: 'active',
    activeProvider: completedSession.provider,
    grantedAt: now,
    expiresAt,
    updatedAt: now,
    currentSession: completedSession,
    history: [...current.history, completedSession],
  });
};

export const hasDesktopDownloadAccess = (accessState: DesktopAccessState): boolean =>
  normalizeDesktopAccessState(accessState).hasAccess;
