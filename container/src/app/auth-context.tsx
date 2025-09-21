import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

type LoginOptions = {
  rememberEmail?: boolean;
};

interface ApiUserResult {
  token?: string;
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface ApiUserResponse {
  results: ApiUserResult;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  rememberedEmail: string;
  login: (email: string, password: string, options?: LoginOptions) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateRememberedEmail: (value: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_TOKEN_KEY = 'mfe-auth-token';
const AUTH_USER_KEY = 'mfe-auth-user';
const REMEMBER_EMAIL_KEY = 'mfe-auth-remember-email';

const API_BASE_URL =
  process.env.NX_AUTH_API_URL && process.env.NX_AUTH_API_URL.trim().length > 0
    ? process.env.NX_AUTH_API_URL
    : 'http://localhost:4300';

const DEFAULT_ENVIRONMENT =
  process.env.NX_APP_ENV && process.env.NX_APP_ENV.trim().length > 0
    ? process.env.NX_APP_ENV
    : 'development';

function ensureLeadingSlash(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}

async function safeParseJson(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return { message: text };
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const url = new URL(ensureLeadingSlash(path), API_BASE_URL);
  const headers = new Headers(init.headers ?? {});
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set('x-app-env', DEFAULT_ENVIRONMENT);
  headers.set('x-app-domain', hostname);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (process.env.NODE_ENV !== 'production') {
    // Helpful when testing header stripping issues
    console.debug('[auth] request headers', {
      path: url.pathname,
      env: headers.get('x-app-env'),
      domain: headers.get('x-app-domain'),
      hasAuth: headers.has('Authorization'),
    });
  }

  const response = await fetch(String(url), {
    ...init,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  const data = await safeParseJson(response);

  if (!response.ok) {
    const message =
      (data as { error?: string; message?: string; detail?: string }).error ||
      (data as { error?: string; message?: string; detail?: string }).detail ||
      (data as { error?: string; message?: string; detail?: string }).message ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

function normaliseUser(result: ApiUserResult): AuthUser {
  return {
    id: result.id,
    email: result.email,
    firstName: result.first_name,
    lastName: result.last_name,
  };
}

function readStoredValue(key: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn('[auth] Unable to read from localStorage', error);
    return null;
  }
}

function writeStoredValue(key: string, value: string | null) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch (error) {
    console.warn('[auth] Unable to write to localStorage', error);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(true);
  const [rememberedEmail, setRememberedEmail] = useState<string>(() => readStoredValue(REMEMBER_EMAIL_KEY) ?? '');

  const storeAuthState = useCallback((nextToken: string, nextUser: AuthUser) => {
    setToken(nextToken);
    setUser(nextUser);
    writeStoredValue(AUTH_TOKEN_KEY, nextToken);
    writeStoredValue(AUTH_USER_KEY, JSON.stringify(nextUser));
  }, []);

  const clearAuthState = useCallback(() => {
    setToken(null);
    setUser(null);
    writeStoredValue(AUTH_TOKEN_KEY, null);
    writeStoredValue(AUTH_USER_KEY, null);
  }, []);

  const updateRememberedEmail = useCallback((value: string | null) => {
    const normalised = value && value.trim().length > 0 ? value.trim() : null;
    setRememberedEmail(normalised ?? '');
    writeStoredValue(REMEMBER_EMAIL_KEY, normalised);
  }, []);

  const fetchProfile = useCallback(
    async (activeToken: string) => {
      const profile = await request<ApiUserResponse>('/api/profile', { method: 'GET' }, activeToken);
      const result = profile.results;
      const resolvedToken = result.token ?? activeToken;
      const nextUser = normaliseUser(result);
      storeAuthState(resolvedToken, nextUser);
      return nextUser;
    },
    [storeAuthState]
  );

  const login = useCallback(
    async (email: string, password: string, options: LoginOptions = {}) => {
      setIsAuthenticating(true);
      try {
        const payload = {
          email: email.trim(),
          password,
        };

        const response = await request<ApiUserResponse>('/api/login', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        const result = response.results;

        if (!result.token) {
          throw new Error('Authentication response did not include a token.');
        }

        const nextUser = normaliseUser(result);
        storeAuthState(result.token, nextUser);

        if (options.rememberEmail) {
          updateRememberedEmail(result.email);
        } else {
          updateRememberedEmail(null);
        }

        return nextUser;
      } catch (error) {
        clearAuthState();
        throw error instanceof Error ? error : new Error('Unable to authenticate.');
      } finally {
        setIsAuthenticating(false);
      }
    },
    [clearAuthState, storeAuthState, updateRememberedEmail]
  );

  const logout = useCallback(async () => {
    const activeToken = token;
    clearAuthState();

    if (!activeToken) {
      return;
    }

    try {
      await request('/api/logout', { method: 'POST' }, activeToken);
    } catch (error) {
      console.warn('[auth] Logout request failed', error);
    }
  }, [clearAuthState, token]);

  useEffect(() => {
    const storedToken = readStoredValue(AUTH_TOKEN_KEY);
    const storedUserRaw = readStoredValue(AUTH_USER_KEY);

    if (storedUserRaw) {
      try {
        const parsedUser = JSON.parse(storedUserRaw) as AuthUser;
        setUser(parsedUser);
      } catch (error) {
        console.warn('[auth] Stored user data could not be parsed', error);
      }
    }

    if (storedToken) {
      setToken(storedToken);
      (async () => {
        try {
          await fetchProfile(storedToken);
        } catch (error) {
          console.warn('[auth] Stored session validation failed', error);
          clearAuthState();
        } finally {
          setIsAuthenticating(false);
        }
      })();
    } else {
      setIsAuthenticating(false);
    }
  }, [clearAuthState, fetchProfile]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isAuthenticating,
      rememberedEmail,
      login,
      logout,
      updateRememberedEmail,
    }),
    [isAuthenticating, login, logout, rememberedEmail, token, updateRememberedEmail, user]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
