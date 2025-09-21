import React from 'react';
import {
  AppBar,
  Box,
  Button,
  Container,
  Toolbar,
  Typography,
} from '@mui/material';
import { Link as RouterLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useLogoutMutation } from './services/auth-api';
import { useAppDispatch, useAppSelector } from './store/hooks';
import {
  clearSession,
  selectCurrentUser,
  selectIsAuthenticated,
} from './store/auth-slice';

export const ProtectedRoute: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentUser = useAppSelector(selectCurrentUser);
  const [logout, { isLoading }] = useLogoutMutation();

  if (!isAuthenticated) {
    const target = `${location.pathname}${location.search}` || '/dashboard';
    return <Navigate to="/login" state={{ from: target }} replace />;
  }

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch (error) {
      // Ignore network failures when clearing a local-only session.
    } finally {
      dispatch(clearSession());
      navigate('/login', { replace: true });
    }
  };

  return (
    <Box>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Micro Frontend Portal
          </Typography>

          {currentUser ? (
            <Typography variant="body2" sx={{ mr: 3 }}>
              {currentUser.firstName} {currentUser.lastName}
            </Typography>
          ) : null}

          <Button color="inherit" component={RouterLink} to="/dashboard">
            Dashboard
          </Button>
          <Button color="inherit" component={RouterLink} to="/users" sx={{ ml: 1 }}>
            Users
          </Button>
          <Button
            color="inherit"
            onClick={handleLogout}
            sx={{ ml: 2 }}
            disabled={isLoading}
          >
            {isLoading ? 'Logging out…' : 'Log out'}
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  );
};
