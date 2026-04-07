import type { AuthSession } from "../types/auth";

const STORAGE_KEY = "job-system-admin.session";
export const AUTH_EXPIRED_EVENT = "job-system-admin.auth-expired";

export function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function writeStoredSession(session: AuthSession): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function dispatchAuthExpiredEvent(): void {
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
}
