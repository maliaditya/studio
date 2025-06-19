
"use client";

// IMPORTANT: This is a basic local authentication for prototype purposes.
// Storing passwords (even if "hashed" client-side) in localStorage is NOT SECURE for production.
// This implementation stores passwords in plain text for simplicity of the request.

import type { LocalUser } from '@/types/workout';

const USER_CREDENTIALS_KEY = "userCredentials"; // Stores { [username: string]: password_string }
const CURRENT_USER_KEY = "currentUser"; // Stores username string of logged-in user

interface UserCredentials {
  [username: string]: string; // password
}

function getStoredCredentials(): UserCredentials {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(USER_CREDENTIALS_KEY);
    return stored ? JSON.parse(stored) : {};
  }
  return {};
}

function storeCredentials(credentials: UserCredentials) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_CREDENTIALS_KEY, JSON.stringify(credentials));
  }
}

export function registerUser(username: string, password: string): Promise<{ success: boolean, message: string, user?: LocalUser }> {
  return new Promise((resolve) => {
    const credentials = getStoredCredentials();
    if (credentials[username]) {
      resolve({ success: false, message: "Username already exists." });
      return;
    }
    credentials[username] = password; // Storing password directly - NOT SECURE
    storeCredentials(credentials);
    const user: LocalUser = { username };
    // Automatically log in the user after registration
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENT_USER_KEY, username);
    }
    resolve({ success: true, message: "Registration successful.", user });
  });
}

export function loginUser(username: string, password: string): Promise<{ success: boolean, message: string, user?: LocalUser }> {
  return new Promise((resolve) => {
    const credentials = getStoredCredentials();
    if (!credentials[username]) {
      resolve({ success: false, message: "Username not found." });
      return;
    }
    if (credentials[username] !== password) { // Direct password comparison - NOT SECURE
      resolve({ success: false, message: "Incorrect password." });
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENT_USER_KEY, username);
    }
    const user: LocalUser = { username };
    resolve({ success: true, message: "Login successful.", user });
  });
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
    return username ? { username } : null;
  }
  return null;
}
