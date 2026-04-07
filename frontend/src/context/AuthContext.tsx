import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthSession } from "../types/auth";
import {
  clearAuthSession,
  ensureFreshSession,
  loginWithCredentials,
  loginWithManualToken,
} from "../lib/auth";
import { AUTH_EXPIRED_EVENT } from "../lib/storage";

type AuthContextValue = {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isReady: boolean;
  signInWithCredentials: (username: string, password: string) => Promise<void>;
  signInWithToken: (token: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateSession() {
      const currentSession = await ensureFreshSession();

      if (isMounted) {
        setSession(currentSession);
        setIsReady(true);
      }
    }

    void hydrateSession();

    function handleAuthExpired() {
      setSession(null);
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);

    return () => {
      isMounted = false;
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, []);

  async function signInWithToken(token: string) {
    const nextSession = await loginWithManualToken(token);
    setSession(nextSession);
  }

  async function signInWithUserPassword(username: string, password: string) {
    const nextSession = await loginWithCredentials(username, password);
    setSession(nextSession);
  }

  function logout() {
    clearAuthSession();
    setSession(null);
  }

  const value: AuthContextValue = {
    session,
    isAuthenticated: Boolean(session),
    isReady,
    signInWithCredentials: signInWithUserPassword,
    signInWithToken,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
