export type AuthMode = "manual" | "cognito";

export type SessionUser = {
  sub?: string;
  email?: string;
  username?: string;
  name?: string;
  displayName: string;
};

export type AuthSession = {
  authMode: AuthMode;
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: number;
  user: SessionUser;
};
