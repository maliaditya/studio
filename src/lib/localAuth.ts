
"use client";

// IMPORTANT: This service now uses Vercel Blob for user data storage.
// It keeps a local session token (the username) in localStorage.

import type { LocalUser } from '@/types/workout';

const CURRENT_USER_KEY = "currentUser"; // Stores username string of logged-in user

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
    }
    return { success: true, message: result.message, user };

  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, message: "An unexpected error occurred. Please try again." };
  }
}

export async function loginUser(username: string, password: string): Promise<{ success: boolean, message: string, user?: LocalUser }> {
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

    const user: LocalUser = { username };
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENT_USER_KEY, username);
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
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    resolve();
  });
}

export function getCurrentLocalUser(): LocalUser | null {
  if (typeof window !== 'undefined') {
    const username = localStorage.getItem(CURRENT_USER_KEY);
    if (!username) return null;
    
    return { 
      username, 
    };
  }
  return null;
}
