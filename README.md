# Micro Frontend Authentication Starter

This repository contains a lightweight module-federated playground with a container
application, a Users micro frontend, and a Dashboard micro frontend. The container
now presents a login screen by default and unlocks the MFEs only after a successful
sign-in, mirroring a conventional SaaS entry point.

## Architecture Overview

- **React 17 + React Router 6** power all three applications.
- **Redux Toolkit + Redux Persist** keep the authentication token and user profile
  consistent across reloads.
- **RTK Query with `@rtk-query/graphql-request-base-query`** handles network calls and
  automatically injects the headers required for Groundcover header debugging.
- **Material UI + React Hook Form + Yup** provide a small but pleasant login form.
- **Module Federation utilities** from `@my-mfe-test/shared` still mount the Users and
  Dashboard MFEs once the session is validated.

When the app starts users land on `/login`. After entering valid credentials they are
redirected to `/dashboard`, and navigation to `/users` is also available from the top
app bar. Signing out clears the persisted token and returns to the login page.

## Local Development

```bash
npm install
npm start
# in another terminal
npm run serve:auth-backend
```

The `npm start` script launches the container on <http://localhost:4200> together with
the Users MFE (port 4201) and Dashboard MFE (port 4202). The authentication backend
listens on <http://localhost:4300/graphql> by default and automatically restarts when
you rerun `nx serve auth-backend`.

### Demo authentication backend

The repository now ships with a zero-dependency Node.js GraphQL server tailored to the
frontend contract. Start it with `npm run serve:auth-backend`. The backend validates
credentials using the following simple rules:

- The email must contain an `@` symbol.
- The password cannot be empty.

Successful logins generate an in-memory token and derive a friendly name from the email
address (for example, `jane.doe@example.com` becomes **Jane Doe**). Sessions persist in
memory until `logout` is called or the process restarts.

### Expected Authentication API

The frontend expects a GraphQL endpoint (default: `http://localhost:4300/graphql`). You
can change it by defining `NX_AUTH_API_URL` in your environment. The following
operations are invoked:

- `login(input: { email, password })` → returns `{ token, user { id, email, firstName, lastName } }`
- `currentUser` → returns the same payload to refresh persisted sessions
- `logout` → returns `{ success }`
- `verifyToken` → returns `{ valid }`

Every request automatically includes these headers so the Groundcover investigation can
focus on the header-stripping behaviour:

- `Authorization: Bearer <token>` (when a token exists)
- `X-App-Env: <environment>` (`NX_APP_ENV` or `development`)
- `X-App-Domain: <window.location.hostname>`

## Environment Variables

| Variable          | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `NX_AUTH_API_URL` | Optional override for the GraphQL authentication URL |
| `NX_APP_ENV`      | Optional override for the `X-App-Env` header         |
| `NX_GROUNDCOVER_*`| Existing settings to enable the Groundcover SDK      |

## Next Steps

Extend the demo backend with persistent storage, connect it to your identity provider,
or replace it with your production authentication service once you finish validating
the Groundcover header behaviour.
