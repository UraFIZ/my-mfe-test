import React, { useEffect } from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { MfeLoader, FEATURE_APP_ID, getMfePort } from '@my-mfe-test/shared';
import groundcover from '@groundcover/browser';
import './app.css';
import { AuthProvider, useAuth } from './auth-context';
import { ProtectedRoute } from './protected-route';
import { LoginPage } from './login-page';

const Users = () => (
  <MfeLoader port={getMfePort(FEATURE_APP_ID.USERS_MFE)} mfeId={FEATURE_APP_ID.USERS_MFE} />
);

const Dashboard = () => (
  <MfeLoader port={getMfePort(FEATURE_APP_ID.DASHBOARD_MFE)} mfeId={FEATURE_APP_ID.DASHBOARD_MFE} />
);

const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-container">
      <h1>🏠 Welcome to Module Federation Hub</h1>
      <p>
        {isAuthenticated
          ? 'Choose a micro-frontend to explore the authenticated experiences.'
          : 'Sign in to unlock the Users and Dashboard micro-frontends.'}
      </p>

      <div className="home-note">
        <p>
          The container stores a short-lived token locally and automatically attaches the
          <code>X-App-Env</code>, <code>X-App-Domain</code>, and <code>Authorization</code> headers so
          you can reproduce the Groundcover header issue without any SSO dependencies.
        </p>
      </div>

      <div className="mfe-cards">
        <div className="mfe-card">
          <h3>👥 Users MFE</h3>
          <p>User management, profiles, and authentication</p>
          <Link
            to={isAuthenticated ? '/users' : '/login'}
            state={isAuthenticated ? undefined : { from: '/users' }}
            className="btn-primary"
          >
            {isAuthenticated ? 'Go to Users' : 'Sign in to continue'}
          </Link>
        </div>
        <div className="mfe-card">
          <h3>📊 Dashboard MFE</h3>
          <p>Analytics, reports, and business intelligence</p>
          <Link
            to={isAuthenticated ? '/dashboard' : '/login'}
            state={isAuthenticated ? undefined : { from: '/dashboard' }}
            className="btn-primary"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Sign in to continue'}
          </Link>
        </div>
      </div>
    </div>
  );
};

const AppShell: React.FC = () => {
  const { user, isAuthenticated, isAuthenticating, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (process.env.NX_GROUNDCOVER_API_KEY && process.env.NX_GROUNDCOVER_DSN) {
      groundcover.init({
        apiKey: process.env.NX_GROUNDCOVER_API_KEY,
        dsn: process.env.NX_GROUNDCOVER_DSN,
        environment: 'staging',
        appId: process.env.NX_GROUNDCOVER_APP_ID || 'hub',
        cluster: 'default',
        options: {
          batchSize: 50,
          sessionSampleRate: 1.0,
          debug: true,
        },
      });
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app">
      <header className="app-header">
        <h2>Module Federation Development Environment</h2>
      </header>

      <nav className="app-nav">
        <div className="nav-links">
          <Link to="/" className="nav-link">
            🏠 Home
          </Link>
          <Link
            to={isAuthenticated ? '/users' : '/login'}
            state={isAuthenticated ? undefined : { from: '/users' }}
            className="nav-link"
          >
            👥 Users
          </Link>
          <Link
            to={isAuthenticated ? '/dashboard' : '/login'}
            state={isAuthenticated ? undefined : { from: '/dashboard' }}
            className="nav-link"
          >
            📊 Dashboard
          </Link>
        </div>

        <div className="auth-status">
          {isAuthenticating ? (
            <span className="auth-status__message">Checking session…</span>
          ) : isAuthenticated ? (
            <>
              <span className="auth-status__user">
                Signed in as {user?.firstName} {user?.lastName}
              </span>
              <button type="button" className="btn-link" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-link">
              Log in
            </Link>
          )}
        </div>
      </nav>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/users/*"
            element={
              <ProtectedRoute>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <div className="dev-info">
          <h4>🔧 Development Info</h4>
          <ul>
            <li>
              <strong>Container:</strong> http://localhost:4200 (this app)
            </li>
            <li>
              <strong>Users MFE:</strong> http://localhost:4201
            </li>
            <li>
              <strong>Dashboard MFE:</strong> http://localhost:4202
            </li>
          </ul>
          <p className="start-info">
            💡 All MFEs are started automatically with <code>npm start</code>
          </p>
        </div>
      </footer>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
