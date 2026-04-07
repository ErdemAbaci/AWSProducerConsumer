import type { AuthMode } from "../types/auth";

export type CognitoConfig = {
  region: string;
  userPoolId: string;
  clientId: string;
};

export type AppConfig = {
  appTitle: string;
  apiBaseUrl: string;
  authMode: AuthMode;
  cognito: CognitoConfig;
};

function getAuthMode(): AuthMode {
  return import.meta.env.VITE_AUTH_MODE === "cognito" ? "cognito" : "manual";
}

function trimTrailingSlash(value: string | undefined): string {
  return (value ?? "").replace(/\/+$/, "");
}

export const appConfig: AppConfig = {
  appTitle: import.meta.env.VITE_APP_TITLE?.trim() || "Job System Admin",
  apiBaseUrl: trimTrailingSlash(import.meta.env.VITE_API_BASE_URL),
  authMode: getAuthMode(),
  cognito: {
    region: import.meta.env.VITE_COGNITO_REGION?.trim() || "",
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID?.trim() || "",
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID?.trim() || "",
  },
};

export function isCognitoConfigured(config: CognitoConfig): boolean {
  return Boolean(config.region && config.clientId);
}
