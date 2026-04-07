import type { SessionUser } from "../types/auth";

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(paddingLength);

  return atob(padded);
}

export function normalizeBearerToken(value: string): string {
  return value.replace(/^Bearer\s+/i, "").trim();
}

export function isJwtLike(token: string): boolean {
  return token.split(".").length === 3;
}

export function parseJwtPayload(token: string): Record<string, unknown> | null {
  if (!isJwtLike(token)) {
    return null;
  }

  try {
    const [, payload] = token.split(".");

    return JSON.parse(decodeBase64Url(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readString(
  payload: Record<string, unknown> | null,
  key: string,
): string | undefined {
  const value = payload?.[key];

  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

export function getTokenExpiration(token: string): number | undefined {
  const payload = parseJwtPayload(token);
  const exp = payload?.exp;

  return typeof exp === "number" ? exp * 1000 : undefined;
}

export function getSessionUserFromToken(token: string): SessionUser {
  const payload = parseJwtPayload(token);
  const email = readString(payload, "email");
  const username =
    readString(payload, "cognito:username") ||
    readString(payload, "preferred_username") ||
    readString(payload, "username");
  const name = readString(payload, "name");
  const sub = readString(payload, "sub");

  return {
    sub,
    email,
    username,
    name,
    displayName: email || username || name || sub || "Authenticated user",
  };
}
