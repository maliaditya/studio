
"use client";

// IMPORTANT: This service now uses Vercel Blob for user data storage.
// It keeps a local session token (the username) in localStorage.

import type { LocalUser } from '@/types/workout';

const CURRENT_USER_KEY = "currentUser"; // Stores username string of logged-in user
const ACTIVE_SESSION_KEY = "lifeos_active_session"; // Stores active session metadata
const TAB_ID_KEY = "lifeos_tab_id";
const SESSION_TTL_MS = 90 * 1000;

type ActiveSession = {
  username: string;
  sessionId: string;
  lastSeen: number;
  startedAt: number;
};

const getTabId = () => {
  if (typeof window === 'undefined') return 'server';
  const existing = sessionStorage.getItem(TAB_ID_KEY);
  if (existing) return existing;
  const next = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem(TAB_ID_KEY, next);
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
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
};

const isSessionStale = (session: ActiveSession) => Date.now() - session.lastSeen > SESSION_TTL_MS;

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

export async function registerUser(username: string, password: string): Promise<{ success: boolean, message: string, user?: LocalUser }> {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, message: result.error || 'Registration failed.' };
    }
    
    // On successful registration, automatically log the user in locally
    const user: LocalUser = { username };
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENT_USER_KEY, username);
      establishSession(username);
    }
    return { success: true, message: result.message, user };

  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, message: "An unexpected error occurred. Please try again." };
  }
}

export async function loginUser(
  username: string,
  password: string,
  opts?: { force?: boolean }
): Promise<{ success: boolean, message: string, user?: LocalUser, code?: "SESSION_ACTIVE" }> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    if (!response.ok) {
        return { success: false, message: result.error || 'Login failed.' };
    }

    if (!opts?.force && hasActiveSessionConflict(username)) {
      return { success: false, code: "SESSION_ACTIVE", message: "This account is already open in another session. Please log out there first." };
    }

    const user: LocalUser = { username };
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENT_USER_KEY, username);
      establishSession(username);
    }
    
    return { success: true, message: result.message, user };
    
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: "An unexpected error occurred. Please try again." };
  }
}

export function logoutUser(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined') {
      clearSessionIfOwned();
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    resolve();
  });
}

export function getCurrentLocalUser(): LocalUser | null {
  if (typeof window !== 'undefined') {
    const username = localStorage.getItem(CURRENT_USER_KEY);
    if (!username) return null;

    if (hasActiveSessionConflict(username)) {
      return null;
    }

    const active = readActiveSession();
    if (!active || isSessionStale(active) || active.username !== username) {
      establishSession(username);
    }

    return { username };
  }
  return null;
}
