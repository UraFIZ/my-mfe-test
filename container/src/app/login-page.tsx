import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useLoginMutation } from './services/auth-api';
import { useAppDispatch, useAppSelector } from './store/hooks';
import {
  selectIsAuthenticated,
  selectRememberedEmail,
  setRememberedEmail,
} from './store/auth-slice';

interface LocationState {
  from?: string;
}

const loginSchema = yup.object({
  email: yup
    .string()
    .email('Enter a valid email address')
    .required('Email is required'),
  password: yup.string().required('Password is required'),
});

type LoginFormValues = yup.InferType<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const rememberedEmail = useAppSelector(selectRememberedEmail);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [login, { isLoading }] = useLoginMutation();
  const [formError, setFormError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState<boolean>(Boolean(rememberedEmail));

  const defaultEmail = useMemo(() => rememberedEmail ?? '', [rememberedEmail]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
  } = useForm<LoginFormValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: defaultEmail,
      password: '',
    },
  });

  useEffect(() => {
    setValue('email', defaultEmail);
    setRememberMe(Boolean(defaultEmail));
  }, [defaultEmail, setValue]);

  const destination = useMemo(() => {
    const state = location.state as LocationState | undefined;
    return state?.from ?? '/dashboard';
  }, [location.state]);

  const handleRememberToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setRememberMe(checked);

    if (checked) {
      dispatch(setRememberedEmail(getValues('email')));
    } else {
      dispatch(setRememberedEmail(undefined));
    }
  };

  const handleFormSubmit = async (values: LoginFormValues) => {
    setFormError(null);

    try {
      await login(values).unwrap();

      if (rememberMe) {
        dispatch(setRememberedEmail(values.email));
      } else {
        dispatch(setRememberedEmail(undefined));
      }

      navigate(destination, { replace: true });
    } catch (error) {
      let message = 'Unable to sign in. Please check your credentials and try again.';

      if (typeof error === 'object' && error !== null) {
        const candidate = error as { message?: string; data?: unknown };

        if (candidate.message) {
          message = candidate.message;
        } else if (candidate.data && typeof candidate.data === 'object') {
          const data = candidate.data as Record<string, unknown>;
          if (typeof data.error === 'string') {
            message = data.error;
          } else if (typeof data.message === 'string') {
            message = data.message;
          } else if (Array.isArray(data.errors) && data.errors[0]?.message) {
            message = String(data.errors[0].message);
          }
        }
      }

      setFormError(message);
    }
  };

  if (isAuthenticated) {
    return <Navigate to={destination} replace />;
  }

  return (
    <Box
      className="login-page"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Paper elevation={6} sx={{ width: '100%', maxWidth: 420, p: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Welcome back
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Sign in to reach the dashboard and micro frontends.
        </Typography>

        {formError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {formError}
          </Alert>
        ) : null}

        <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              {...register('email')}
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              {...register('password')}
              error={Boolean(errors.password)}
              helperText={errors.password?.message}
            />
            <FormControlLabel
              control={
                <Checkbox checked={rememberMe} onChange={handleRememberToggle} />
              }
              label="Remember my email"
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};
