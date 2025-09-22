import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import {
  Box,
  CircularProgress,
  CssBaseline,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import groundcover from '@groundcover/browser';
import { MfeLoader, FEATURE_APP_ID, getMfePort } from '@my-mfe-test/shared';
import './app.css';
import { LoginPage } from './login-page';
import { ProtectedRoute } from './protected-route';
import { store, persistor } from './store';
import { useAppSelector } from './store/hooks';
import { selectIsAuthenticated } from './store/auth-slice';
import { SessionManager } from './session-manager';

const theme = createTheme();

const UsersApp: React.FC = () => (
  <MfeLoader
    port={getMfePort(FEATURE_APP_ID.USERS_MFE)}
    mfeId={FEATURE_APP_ID.USERS_MFE}
  />
);

const DashboardApp: React.FC = () => (
  <MfeLoader
    port={getMfePort(FEATURE_APP_ID.DASHBOARD_MFE)}
    mfeId={FEATURE_APP_ID.DASHBOARD_MFE}
  />
);

const AppRoutes: React.FC = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard/*" element={<DashboardApp />} />
        <Route path="/users/*" element={<UsersApp />} />
      </Route>
      <Route
        path="/"
        element={
          <Navigate
            to={isAuthenticated ? '/dashboard' : '/login'}
            replace
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const AppShell: React.FC = () => {
  useEffect(() => {
    if (process.env.NX_GROUNDCOVER_API_KEY && process.env.NX_GROUNDCOVER_DSN) {
      groundcover.init({
        apiKey: process.env.NX_GROUNDCOVER_API_KEY,
        dsn: process.env.NX_GROUNDCOVER_DSN,
        environment: process.env.NX_APP_ENV || 'development',
        appId: process.env.NX_GROUNDCOVER_APP_ID || 'container',
        cluster: 'default',
        options: {
          batchSize: 50,
          sessionSampleRate: 1.0,
          debug: true,
        },
      });
    }
  }, []);

  return (
    <Box className="app-shell">
      <SessionManager />
      <AppRoutes />
    </Box>
  );
};

export function App() {
  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            minHeight="100vh"
          >
            <CircularProgress />
          </Box>
        }
        persistor={persistor}
      >
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AppShell />
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
