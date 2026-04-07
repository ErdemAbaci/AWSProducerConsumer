import { appConfig, isCognitoConfigured } from "../config/env";
import type { AuthMode, AuthSession } from "../types/auth";
import { refreshCognitoTokens, signInWithCognito } from "./cognito";
import {
  getSessionUserFromToken,
  getTokenExpiration,
  isJwtLike,
  normalizeBearerToken,
} from "./jwt";
import {
  clearStoredSession,
  dispatchAuthExpiredEvent,
  readStoredSession,
  writeStoredSession,
} from "./storage";

const REFRESH_BUFFER_MS = 60_000;

type SessionTokenInput = {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
};

function createSession(
  authMode: AuthMode,
  tokens: SessionTokenInput,
  previousSession?: AuthSession,
): AuthSession {
  const primaryToken = tokens.idToken || tokens.accessToken;

  return {
    authMode,
    accessToken: tokens.accessToken,
    idToken: tokens.idToken,
    refreshToken: tokens.refreshToken || previousSession?.refreshToken,
    tokenType: tokens.tokenType || previousSession?.tokenType || "Bearer",
    expiresAt:
      tokens.expiresIn !== undefined
        ? Date.now() + tokens.expiresIn * 1000
        : getTokenExpiration(primaryToken) || previousSession?.expiresAt,
    user: getSessionUserFromToken(primaryToken),
  };
}

export function getStoredSession(): AuthSession | null {
  return readStoredSession();
}

export function getBearerToken(session: AuthSession): string {
  return session.accessToken || session.idToken || "";
}

export async function loginWithManualToken(rawToken: string): Promise<AuthSession> {
  const token = normalizeBearerToken(rawToken);

  if (!token || !isJwtLike(token)) {
    throw new Error(
      "Manual token mode expects a Cognito JWT. Paste an ID token or access token.",
    );
  }

  const session = createSession("manual", {
    accessToken: token,
    idToken: token,
    tokenType: "Bearer",
  });

  writeStoredSession(session);
  return session;
}

export async function loginWithCredentials(
  username: string,
  password: string,
): Promise<AuthSession> {
  if (!isCognitoConfigured(appConfig.cognito)) {
    throw new Error(
      "Cognito settings are incomplete. Set VITE_COGNITO_REGION and VITE_COGNITO_CLIENT_ID first.",
    );
  }

  const result = await signInWithCognito(appConfig.cognito, username, password);
  const session = createSession("cognito", {
    accessToken: result.AccessToken,
    idToken: result.IdToken,
    refreshToken: result.RefreshToken,
    tokenType: result.TokenType,
    expiresIn: result.ExpiresIn,
  });

  writeStoredSession(session);
  return session;
}

export async function ensureFreshSession(): Promise<AuthSession | null> {
  const session = readStoredSession();

  if (!session) {
    return null;
  }

  if (!session.expiresAt || session.expiresAt - Date.now() > REFRESH_BUFFER_MS) {
    return session;
  }

  if (
    session.authMode !== "cognito" ||
    !session.refreshToken ||
    !isCognitoConfigured(appConfig.cognito)
  ) {
    clearAuthSession();
    return null;
  }

  try {
    const refreshed = await refreshCognitoTokens(
      appConfig.cognito,
      session.refreshToken,
    );
    const nextSession = createSession(
      "cognito",
      {
        accessToken: refreshed.AccessToken,
        idToken: refreshed.IdToken,
        refreshToken: session.refreshToken,
        tokenType: refreshed.TokenType,
        expiresIn: refreshed.ExpiresIn,
      },
      session,
    );

    writeStoredSession(nextSession);
    return nextSession;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function clearAuthSession(): void {
  clearStoredSession();
  dispatchAuthExpiredEvent();
}
