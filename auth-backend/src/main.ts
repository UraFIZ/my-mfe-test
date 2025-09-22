import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { parse } from 'node:url';
import { randomUUID } from 'node:crypto';

type GraphQLContext = {
  token: string | null;
  headers: IncomingMessage['headers'];
};

type UserProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

type SessionRecord = {
  token: string;
  user: UserProfile;
  createdAt: number;
};

type GraphQLResponse = {
  data?: Record<string, unknown>;
  errors?: { message: string }[];
};

type OperationName = 'login' | 'logout' | 'currentUser' | 'verifyToken';

class BackendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackendError';
  }
}

const DEFAULT_PORT = 4300;
const HOST = process.env.HOST ?? '0.0.0.0';
const parsedPort = Number.parseInt(
  process.env.PORT ?? process.env.NX_AUTH_API_PORT ?? `${DEFAULT_PORT}`,
  10,
);
const PORT = Number.isNaN(parsedPort) ? DEFAULT_PORT : parsedPort;

const sessions = new Map<string, SessionRecord>();
const usersByEmail = new Map<string, UserProfile>();
const REQUIRED_HEADERS = ['x-app-env', 'x-app-domain'] as const;

const OPERATION_ALIASES: Record<string, OperationName> = {
  login: 'login',
  logout: 'logout',
  currentuser: 'currentUser',
  current_user: 'currentUser',
  verifytoken: 'verifyToken',
  verify_token: 'verifyToken',
};

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request
      .on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      })
      .on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf8'));
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

function normalizeName(part: string | undefined, fallback: string): string {
  if (!part) {
    return fallback;
  }

  const [firstCharacter, ...rest] = part.toLowerCase();
  return `${firstCharacter?.toUpperCase() ?? ''}${rest.join('')}`;
}

function deriveUserFromEmail(email: string): UserProfile {
  const cached = usersByEmail.get(email);
  if (cached) {
    return cached;
  }

  const [localPart] = email.split('@');
  const [firstNameSegment, lastNameSegment] = localPart?.split(/[._-]/) ?? [];

  const user: UserProfile = {
    id: randomUUID(),
    email,
    firstName: normalizeName(firstNameSegment, 'Test'),
    lastName: normalizeName(lastNameSegment, 'User'),
  };

  usersByEmail.set(email, user);
  return user;
}

function ensureHeadersPresent(headers: IncomingMessage['headers']): void {
  const missing = REQUIRED_HEADERS.filter(
    (header) => !(header in headers) || headers[header] === undefined,
  );

  if (missing.length > 0) {
    console.warn(
      `Auth backend received request missing expected headers: ${missing.join(', ')}`,
    );
  }
}

function parseAuthorizationToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, value] = authorizationHeader.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || !value) {
    return null;
  }

  return value;
}

function getSessionOrThrow(token: string | null): SessionRecord {
  if (!token) {
    throw new BackendError('Unauthorized');
  }

  const session = sessions.get(token);
  if (!session) {
    throw new BackendError('Invalid or expired session');
  }

  return session;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function normalizeOperationName(value: string | undefined | null): OperationName | null {
  if (!value) {
    return null;
  }

  const compact = value.replace(/[^a-z]/gi, '').toLowerCase();
  return OPERATION_ALIASES[compact] ?? null;
}

function extractOperationName(query: string | undefined): OperationName | null {
  if (!query) {
    return null;
  }

  const patterns: [RegExp, OperationName][] = [
    [/mutation\s+login/i, 'login'],
    [/mutation\s+logout/i, 'logout'],
    [/query\s+currentUser/i, 'currentUser'],
    [/query\s+verifyToken/i, 'verifyToken'],
  ];

  for (const [regex, operation] of patterns) {
    if (regex.test(query)) {
      return operation;
    }
  }

  return null;
}

function handleLogin(
  variables: Record<string, unknown> | undefined,
  context: GraphQLContext,
): GraphQLResponse {
  ensureHeadersPresent(context.headers);
  const input = (variables as { input?: { email?: unknown; password?: unknown } } | undefined)
    ?.input ?? {};

  const email = asString(input.email)?.trim().toLowerCase();
  const password = asString(input.password)?.trim();

  if (!email || !email.includes('@')) {
    throw new BackendError('Please provide a valid email address.');
  }

  if (!password) {
    throw new BackendError('Password is required.');
  }

  const user = deriveUserFromEmail(email);
  const token = randomUUID();

  sessions.set(token, {
    token,
    user,
    createdAt: Date.now(),
  });

  return {
    data: {
      login: {
        token,
        user,
      },
    },
  };
}

function handleLogout(
  _variables: Record<string, unknown> | undefined,
  context: GraphQLContext,
): GraphQLResponse {
  ensureHeadersPresent(context.headers);
  if (context.token && sessions.has(context.token)) {
    sessions.delete(context.token);
  }

  return {
    data: {
      logout: {
        success: true,
      },
    },
  };
}

function handleCurrentUser(
  _variables: Record<string, unknown> | undefined,
  context: GraphQLContext,
): GraphQLResponse {
  ensureHeadersPresent(context.headers);
  const session = getSessionOrThrow(context.token);

  return {
    data: {
      currentUser: {
        token: session.token,
        user: session.user,
      },
    },
  };
}

function handleVerifyToken(
  _variables: Record<string, unknown> | undefined,
  context: GraphQLContext,
): GraphQLResponse {
  ensureHeadersPresent(context.headers);

  const valid = context.token ? sessions.has(context.token) : false;

  return {
    data: {
      verifyToken: {
        valid,
      },
    },
  };
}

function executeOperation(
  operation: OperationName,
  variables: Record<string, unknown> | undefined,
  context: GraphQLContext,
): GraphQLResponse {
  switch (operation) {
    case 'login':
      return handleLogin(variables, context);
    case 'logout':
      return handleLogout(variables, context);
    case 'currentUser':
      return handleCurrentUser(variables, context);
    case 'verifyToken':
      return handleVerifyToken(variables, context);
    default:
      return {
        errors: [
          {
            message: `Unsupported operation: ${operation}`,
          },
        ],
      };
  }
}

async function handleGraphQLRequest(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  const body = await readBody(request);

  if (!body) {
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ errors: [{ message: 'Empty request body' }] }));
    return;
  }

  let payload: {
    query?: string;
    variables?: Record<string, unknown> | null;
    operationName?: string | null;
  };

  try {
    payload = JSON.parse(body);
  } catch (error) {
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({ errors: [{ message: 'Request body must be valid JSON.' }] }),
    );
    return;
  }

  if (!payload.query) {
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({ errors: [{ message: 'The "query" field is required.' }] }),
    );
    return;
  }

  const operation =
    normalizeOperationName(payload.operationName) ?? extractOperationName(payload.query);

  if (!operation) {
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({ errors: [{ message: 'Unsupported GraphQL operation.' }] }),
    );
    return;
  }

  const authorization = request.headers['authorization'];
  const context: GraphQLContext = {
    token: parseAuthorizationToken(
      Array.isArray(authorization) ? authorization[0] : authorization,
    ),
    headers: request.headers,
  };

  try {
    const result = executeOperation(operation, payload.variables ?? undefined, context);
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(result));
  } catch (error) {
    const isBackendError = error instanceof BackendError;
    if (!isBackendError) {
      console.error('Unexpected error while handling operation:', error);
    }

    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({
        errors: [
          {
            message: isBackendError
              ? error.message
              : 'Internal server error',
          },
        ],
      }),
    );
  }
}

const server = createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'content-type, authorization, x-app-env, x-app-domain',
  );
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Credentials', 'true');

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = request.url ?? '';
  const { pathname } = parse(url);

  if (request.method === 'POST' && pathname === '/graphql') {
    await handleGraphQLRequest(request, response);
    return;
  }

  response.writeHead(404, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, HOST, () => {
  console.log(`Auth backend listening on http://${HOST}:${PORT}/graphql`);
  console.log('Ready to accept login, logout, currentUser, and verifyToken operations.');
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

export { server };
