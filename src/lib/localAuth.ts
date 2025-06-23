
"use client";

// IMPORTANT: This is a basic local authentication for prototype purposes.
// It has been updated to store a user profile object instead of just a password.

import type { LocalUser } from '@/types/workout';

const USER_CREDENTIALS_KEY = "userCredentials_v2"; // Key for storing user profile data
const CURRENT_USER_KEY = "currentUser"; // Stores username string of logged-in user

// Defines the structure of the data stored for each user.
interface UserData {
  password: string;
}

// Defines the structure of the entire credentials object in localStorage.
interface UserCredentials {
  [username: string]: UserData;
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
    
    // Create a new user profile object
    credentials[username] = { password }; 
    storeCredentials(credentials);

    const user: LocalUser = { username };
    
    // Automatically log in the user
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENT_USER_KEY, username);
    }
    resolve({ success: true, message: "Registration successful.", user });
  });
}

export function loginUser(username: string, password: string): Promise<{ success: boolean, message: string, user?: LocalUser }> {
  return new Promise((resolve) => {
    const credentials = getStoredCredentials();
    const userData = credentials[username];

    if (!userData) {
      resolve({ success: false, message: "Username not found." });
      return;
    }
    if (userData.password !== password) {
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
    if (!username) return null;
    
    return { 
      username, 
    };
  }
  return null;
}
