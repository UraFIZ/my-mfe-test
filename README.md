# Micro Frontend Authentication Testbed

This workspace hosts a minimal Module Federation setup that reproduces the Groundcover/browser header issue with the smallest possible authentication surface area. The container app now handles login, protects the Users and Dashboard MFEs, and communicates with a lightweight Node.js backend that requires the custom headers involved in the original bug report.

## What was added

- **Authentication context** inside the container that stores a short-lived token, exposes login/logout helpers, and automatically injects the `Authorization`, `X-App-Env`, and `X-App-Domain` headers on every API request.
- **Protected routes** that redirect unauthenticated visitors to `/login` and restore the attempted route after signing in.
- **Login experience** with remember‑my‑email support to make repeated manual testing faster.
- **Simple Node.js backend** (`server/index.mjs`) that keeps in-memory sessions, validates required headers, and returns the response shape described in the testing guide.

## Running the stack locally

Open two terminals in the repository root and run:

```bash
# Terminal 1 – start the auth backend on http://localhost:4300
npm run start:auth-server

# Terminal 2 – start the container and both MFEs
npm start
```

The container is available on [http://localhost:4200](http://localhost:4200). The Users MFE runs on port 4201 and the Dashboard MFE on port 4202.

### Demo credentials

Use the following account to authenticate:

- **Email:** `admin@example.com`
- **Password:** `admin123`

A second user (`analyst@example.com / analyst123`) is also configured so you can test multiple logins if needed.

## Backend endpoints

All routes expect JSON bodies, require the custom headers, and respond in the guide's format:

| Method | Path                | Description                          |
| ------ | ------------------- | ------------------------------------ |
| POST   | `/api/login`        | Validates credentials and returns `{ "results": { token, id, email, first_name, last_name } }` |
| GET    | `/api/profile`      | Validates the bearer token and returns the user profile (and token) |
| POST   | `/api/logout`       | Invalidates the current token        |
| POST   | `/api/verify-token` | Convenience endpoint that simply checks the token and returns `{ "results": { "valid": true } }` |
| GET    | `/api/health`       | Basic health probe without auth      |

Missing headers result in a `400` response so you can immediately see whether Groundcover stripped them.

## Required headers

Every authenticated request from the container includes the following headers. If any are missing the backend rejects the call, helping you reproduce the original issue quickly:

- `Authorization: Bearer <token>`
- `X-App-Env: <environment>` – defaults to `development` or the value of `NX_APP_ENV`
- `X-App-Domain: <hostname>` – resolves to the browser's `window.location.hostname`

## Environment variables

The container accepts two optional variables:

- `NX_AUTH_API_URL` – override the default backend URL (`http://localhost:4300`)
- `NX_APP_ENV` – override the default environment header value (`development`)

Groundcover can still be enabled with the existing `NX_GROUNDCOVER_*` settings; the initialization logic remains unchanged.

## Behaviour summary

1. Visiting `/login` displays the demo form. Successful authentication persists the token and redirects back to the attempted route.
2. Navigation to `/users` or `/dashboard` without a valid session redirects to the login page.
3. Reloading the container attempts to restore the previous session by calling `/api/profile`.
4. Logging out clears storage, informs the backend, and keeps Users/Dashboard inaccessible until the next successful login.

This setup mirrors the testing guide's expectations while matching the repository's existing dependencies (React 19, React Router 6) and keeps the implementation intentionally simple for fast experimentation.
