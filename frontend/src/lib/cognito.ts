import type { CognitoConfig } from "../config/env";

type CognitoAuthResult = {
  AccessToken: string;
  IdToken?: string;
  RefreshToken?: string;
  TokenType?: string;
  ExpiresIn?: number;
};

type CognitoResponse = {
  AuthenticationResult?: CognitoAuthResult;
  message?: string;
  __type?: string;
};

async function initiateAuth(
  region: string,
  body: Record<string, unknown>,
): Promise<CognitoAuthResult> {
  const response = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as CognitoResponse;

  if (!response.ok || !data.AuthenticationResult) {
    throw new Error(data.message || data.__type || "Cognito sign-in failed");
  }

  return data.AuthenticationResult;
}

export async function signInWithCognito(
  config: CognitoConfig,
  username: string,
  password: string,
): Promise<CognitoAuthResult> {
  return initiateAuth(config.region, {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: config.clientId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  });
}

export async function refreshCognitoTokens(
  config: CognitoConfig,
  refreshToken: string,
): Promise<CognitoAuthResult> {
  return initiateAuth(config.region, {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: config.clientId,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  });
}
