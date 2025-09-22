import { createSlice, isAnyOf, PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../services/auth-api';

type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

type AuthState = {
  user?: AuthUser;
  token?: string;
  rememberedEmail?: string;
};

const initialState: AuthState = {
  user: undefined,
  token: undefined,
  rememberedEmail: undefined,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setRememberedEmail: (state, action: PayloadAction<string | undefined>) => {
      const value = action.payload?.trim();
      state.rememberedEmail = value ? value : undefined;
    },
    clearSession: (state) => {
      state.user = undefined;
      state.token = undefined;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      authApi.endpoints.login.matchFulfilled,
      (state, { payload }) => {
        state.user = payload.user;
        state.token = payload.token;
      }
    );

    builder.addMatcher(
      authApi.endpoints.currentUser.matchFulfilled,
      (state, { payload }) => {
        state.user = payload.user;
        state.token = payload.token ?? state.token;
      }
    );

    builder.addMatcher(
      isAnyOf(
        authApi.endpoints.logout.matchFulfilled,
        authApi.endpoints.logout.matchRejected
      ),
      (state) => {
        state.user = undefined;
        state.token = undefined;
      }
    );
  },
});

export const { setRememberedEmail, clearSession } = authSlice.actions;
export const authReducer = authSlice.reducer;

export const selectAuthState = (state: { auth: AuthState }) => state.auth;
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  Boolean(state.auth.token);
export const selectRememberedEmail = (state: { auth: AuthState }) =>
  state.auth.rememberedEmail;
