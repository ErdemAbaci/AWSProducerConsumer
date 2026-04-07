import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { appConfig, isCognitoConfigured } from "../config/env";
import { LoadingState } from "../components/LoadingState";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../lib/utils";

function getRedirectPath(state: unknown): string {
  if (
    state &&
    typeof state === "object" &&
    "from" in state &&
    typeof state.from === "string"
  ) {
    return state.from;
  }

  return "/jobs";
}

export function LoginPage() {
  const { isAuthenticated, isReady, signInWithCredentials, signInWithToken } = useAuth();
  const location = useLocation();
  const redirectTo = getRedirectPath(location.state);
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isReady) {
    return <LoadingState label="Checking your session..." fullscreen />;
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (appConfig.authMode === "cognito") {
        await signInWithCredentials(username.trim(), password);
      } else {
        await signInWithToken(token);
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Could not sign in."));
    } finally {
      setIsSubmitting(false);
    }
  }

  const cognitoReady = isCognitoConfigured(appConfig.cognito);
  const isCognitoMode = appConfig.authMode === "cognito";

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/app-mark.svg" alt="" className="brand-mark brand-mark-large" />
          <p className="eyebrow">Job management</p>
          <h1>{appConfig.appTitle}</h1>
          <p className="auth-description">
            Sign in to manage demo and email jobs for your authenticated user.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isCognitoMode ? (
            <>
              <label className="field">
                <span>Username</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="your.username"
                  autoComplete="username"
                  disabled={isSubmitting}
                  required
                />
              </label>

              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  required
                />
              </label>

              {!cognitoReady ? (
                <div className="inline-message inline-message-warning">
                  Add `VITE_COGNITO_REGION` and `VITE_COGNITO_CLIENT_ID` before using
                  Cognito sign-in mode.
                </div>
              ) : null}
            </>
          ) : (
            <label className="field">
              <span>Cognito token</span>
              <textarea
                rows={8}
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste a Cognito ID token or access token"
                disabled={isSubmitting}
                required
              />
            </label>
          )}

          {error ? <div className="inline-message inline-message-error">{error}</div> : null}

          <button
            type="submit"
            className="button button-primary button-block"
            disabled={isSubmitting || (isCognitoMode && !cognitoReady)}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="auth-help card-muted">
          <h2>Authentication mode</h2>
          {isCognitoMode ? (
            <p>
              This frontend is set to use Cognito&apos;s `USER_PASSWORD_AUTH` flow from
              the browser.
            </p>
          ) : (
            <p>
              Manual mode is enabled. This is useful while wiring the UI before final
              Cognito settings are ready. The auth layer is isolated so it can be
              replaced later without touching the pages.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
