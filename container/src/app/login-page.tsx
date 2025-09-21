import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './auth-context';

type LocationState = {
  from?: string;
};

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isAuthenticating, rememberedEmail, updateRememberedEmail } = useAuth();
  const [email, setEmail] = useState<string>(rememberedEmail);
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(rememberedEmail.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = useMemo(() => {
    const state = location.state as LocationState | null;
    return state?.from ?? '/';
  }, [location.state]);

  useEffect(() => {
    if (rememberedEmail) {
      setEmail((current) => (current ? current : rememberedEmail));
      setRememberMe(true);
    } else {
      setRememberMe(false);
    }
  }, [rememberedEmail]);

  useEffect(() => {
    if (isAuthenticated && !isSubmitting) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo, isSubmitting]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login(trimmedEmail, password, { rememberEmail: rememberMe });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRememberMeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setRememberMe(checked);

    if (!checked) {
      updateRememberedEmail(null);
    } else if (email.trim()) {
      updateRememberedEmail(email.trim());
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Sign in to continue</h1>
        <p className="auth-subtitle">
          Authenticate against the local Node.js backend to unlock both MFEs.
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              disabled={isSubmitting || isAuthenticating}
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              disabled={isSubmitting || isAuthenticating}
            />
          </label>

          <label className="auth-remember">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={handleRememberMeChange}
              disabled={isSubmitting || isAuthenticating}
            />
            <span>Remember my email on this device</span>
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className="btn-primary auth-submit"
            disabled={isSubmitting || isAuthenticating}
          >
            {isSubmitting || isAuthenticating ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="auth-hint">
          <p>Demo account</p>
          <ul>
            <li>
              <strong>Email:</strong> admin@example.com
            </li>
            <li>
              <strong>Password:</strong> admin123
            </li>
          </ul>
          <p>
            Every request sends the <code>X-App-Env</code> and <code>X-App-Domain</code> headers so
            you can reproduce the Groundcover stripping issue locally.
          </p>
        </div>
      </div>
    </div>
  );
};
