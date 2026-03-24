import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import {
  createEmptyDesktopAccessState,
  DESKTOP_PLAN_BILLING_LABEL,
  DESKTOP_PLAN_CURRENCY,
  DESKTOP_PLAN_PRICE_INR,
  normalizeDesktopAccessState,
  type DesktopAccessState,
  type DesktopPaymentProvider,
} from '@/lib/desktopAccess';
import { verifyAccessToken } from '@/lib/authTokens';
import { type DesktopPlanValidity } from '@/lib/desktopPlans';
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

  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  const tokenPayload = bearerToken ? verifyAccessToken(bearerToken) : null;
  const tokenUser = tokenPayload?.sub?.trim().toLowerCase() || null;
  if (tokenUser) return tokenUser;

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

const getPlanExpiryIso = (fromIso: string, planValidity: DesktopPlanValidity): string | null => {
  const next = new Date(fromIso);
  if (planValidity === 'lifetime') return null;
  if (planValidity === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next.toISOString();
};

export const createDesktopCheckoutState = (
  current: DesktopAccessState,
  provider: DesktopPaymentProvider,
  amountInr = DESKTOP_PLAN_PRICE_INR,
  planDetails?: { planId?: string; planHeading?: string; planValidity?: DesktopPlanValidity; billingLabel?: string }
): DesktopAccessState => {
  const now = new Date().toISOString();
  const preserveExistingAccess = current.hasAccess;
  const previousHistory = current.currentSession ? [...current.history, current.currentSession] : [...current.history];
  const planId = String(planDetails?.planId || current.planId || 'desktop_yearly').trim() || 'desktop_yearly';
  const planHeading = String(planDetails?.planHeading || current.planHeading || 'Desktop').trim() || 'Desktop';
  const planValidity = planDetails?.planValidity || current.planValidity || 'yearly';
  const billingLabel = String(planDetails?.billingLabel || current.billingLabel || DESKTOP_PLAN_BILLING_LABEL).trim() || DESKTOP_PLAN_BILLING_LABEL;

  return normalizeDesktopAccessState({
    ...current,
    planId,
    planHeading,
    planValidity,
    billingLabel,
    hasAccess: preserveExistingAccess,
    status: preserveExistingAccess ? 'active' : 'pending',
    activeProvider: preserveExistingAccess ? current.activeProvider : provider,
    updatedAt: now,
    currentSession: {
      id: randomUUID(),
      planId,
      planHeading,
      planValidity,
      billingLabel,
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
  const expiresAt = getPlanExpiryIso(now, current.currentSession.planValidity);
  const completedSession = {
    ...current.currentSession,
    status: 'completed' as const,
    updatedAt: now,
    completedAt: now,
    note: `${current.currentSession.provider} payment confirmed. ${current.currentSession.planHeading} unlocked for one ${current.currentSession.billingLabel} term.`,
  };

  return normalizeDesktopAccessState({
    ...current,
    planId: completedSession.planId,
    planHeading: completedSession.planHeading,
    planValidity: completedSession.planValidity,
    billingLabel: completedSession.billingLabel,
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
