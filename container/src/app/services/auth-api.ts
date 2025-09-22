import { createApi } from '@reduxjs/toolkit/query/react';
import { graphqlRequestBaseQuery } from '@rtk-query/graphql-request-base-query';
import type { RootState } from '../store';

const AUTH_API_URL =
  process.env.NX_AUTH_API_URL && process.env.NX_AUTH_API_URL.trim().length > 0
    ? process.env.NX_AUTH_API_URL
    : 'http://localhost:4300/graphql';

const DEFAULT_ENV =
  process.env.NX_APP_ENV && process.env.NX_APP_ENV.trim().length > 0
    ? process.env.NX_APP_ENV
    : 'development';

type GraphqlUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

type AuthPayload = {
  token: string;
  user: GraphqlUser;
};

type LoginMutationResponse = {
  login: AuthPayload;
};

type CurrentUserQueryResponse = {
  currentUser: AuthPayload;
};

type LogoutMutationResponse = {
  logout: {
    success: boolean;
  };
};

type VerifyTokenResponse = {
  verifyToken: {
    valid: boolean;
  };
};

const LOGIN_DOCUMENT = /* GraphQL */ `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        email
        firstName
        lastName
      }
    }
  }
`;

const CURRENT_USER_DOCUMENT = /* GraphQL */ `
  query CurrentUser {
    currentUser {
      token
      user {
        id
        email
        firstName
        lastName
      }
    }
  }
`;

const LOGOUT_DOCUMENT = /* GraphQL */ `
  mutation Logout {
    logout {
      success
    }
  }
`;

const VERIFY_TOKEN_DOCUMENT = /* GraphQL */ `
  query VerifyToken {
    verifyToken {
      valid
    }
  }
`;

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: graphqlRequestBaseQuery({
    url: AUTH_API_URL,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const token = state.auth?.token;
      const hostname =
        typeof window !== 'undefined' && window.location.hostname
          ? window.location.hostname
          : 'localhost';

      headers.set('content-type', 'application/json');
      headers.set('x-app-env', DEFAULT_ENV);
      headers.set('x-app-domain', hostname);

      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }

      return headers;
    },
  }),
  tagTypes: ['Auth'],
  endpoints: (builder) => ({
    login: builder.mutation<
      { token: string; user: GraphqlUser },
      { email: string; password: string }
    >({
      query: ({ email, password }) => ({
        document: LOGIN_DOCUMENT,
        variables: { input: { email, password } },
      }),
      transformResponse: (response: LoginMutationResponse) => response.login,
      invalidatesTags: ['Auth'],
    }),
    currentUser: builder.query<{ token: string; user: GraphqlUser }, void>({
      query: () => ({
        document: CURRENT_USER_DOCUMENT,
      }),
      transformResponse: (response: CurrentUserQueryResponse) =>
        response.currentUser,
      providesTags: ['Auth'],
    }),
    logout: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        document: LOGOUT_DOCUMENT,
      }),
      transformResponse: (response: LogoutMutationResponse) => response.logout,
      invalidatesTags: ['Auth'],
    }),
    verifyToken: builder.query<{ valid: boolean }, void>({
      query: () => ({
        document: VERIFY_TOKEN_DOCUMENT,
      }),
      transformResponse: (response: VerifyTokenResponse) => response.verifyToken,
      providesTags: ['Auth'],
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useLazyCurrentUserQuery,
  useVerifyTokenQuery,
} = authApi;
