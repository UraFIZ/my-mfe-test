import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { MfeLoader, FEATURE_APP_ID, getMfePort } from '@my-mfe-test/shared';
import './app.css';

// Lazy-loaded MFE components
const Users = () => (
  <MfeLoader
    port={getMfePort(FEATURE_APP_ID.USERS_MFE)}
    mfeId={FEATURE_APP_ID.USERS_MFE}
  />
);

const Dashboard = () => (
  <MfeLoader
    port={getMfePort(FEATURE_APP_ID.DASHBOARD_MFE)}
    mfeId={FEATURE_APP_ID.DASHBOARD_MFE}
  />
);

const Home = () => (
  <div className="home-container">
    <h1>🏠 Welcome to Module Federation Hub</h1>
    <p>This is the container application that loads micro-frontends.</p>
    <div className="mfe-cards">
      <div className="mfe-card">
        <h3>👥 Users MFE</h3>
        <p>User management, profiles, and authentication</p>
        <Link to="/users" className="btn-primary">Go to Users</Link>
      </div>
      <div className="mfe-card">
        <h3>📊 Dashboard MFE</h3>
        <p>Analytics, reports, and business intelligence</p>
        <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
      </div>
    </div>
  </div>
);

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h2>Module Federation Development Environment</h2>
      </header>

      <nav className="app-nav">
        <Link to="/" className="nav-link">🏠 Home</Link>
        <Link to="/users" className="nav-link">👥 Users</Link>
        <Link to="/dashboard" className="nav-link">📊 Dashboard</Link>
      </nav>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/users/*" element={<Users />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <div className="dev-info">
          <h4>🔧 Development Info</h4>
          <ul>
            <li><strong>Container:</strong> http://localhost:4200 (this app)</li>
            <li><strong>Users MFE:</strong> http://localhost:4201</li>
            <li><strong>Dashboard MFE:</strong> http://localhost:4202</li>
          </ul>
          <p className="start-info">💡 All MFEs are started automatically with <code>npm start</code></p>
        </div>
      </footer>
    </div>
  );
}

export default App;
