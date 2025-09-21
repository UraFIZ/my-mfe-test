import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';

const PORT = Number(process.env.AUTH_SERVER_PORT ?? process.env.PORT ?? 4300);
const TOKEN_TTL_MS = Number(process.env.AUTH_TOKEN_TTL_MS ?? 1000 * 60 * 60);

const REQUIRED_HEADERS = ['x-app-env', 'x-app-domain'];

const USERS = [
  {
    id: '1',
    email: 'admin@example.com',
    password: 'admin123',
    firstName: 'Ada',
    lastName: 'Lovelace',
  },
  {
    id: '2',
    email: 'analyst@example.com',
    password: 'analyst123',
    firstName: 'Grace',
    lastName: 'Hopper',
  },
];

const sessions = new Map();

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN ?? '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-App-Env, X-App-Domain'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

function sendJson(res, statusCode, body) {
  setCorsHeaders(res);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(body));
}

function sendText(res, statusCode, body) {
  setCorsHeaders(res);
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
  });
  res.end(body);
}

function handleOptions(res) {
  setCorsHeaders(res);
  res.writeHead(204);
  res.end();
}

function logRequest(req, pathname) {
  console.log('[auth-server]', req.method, pathname, {
    env: req.headers['x-app-env'],
    domain: req.headers['x-app-domain'],
    hasAuth: Boolean(req.headers.authorization),
  });
}

function ensureRequiredHeaders(req, res) {
  for (const header of REQUIRED_HEADERS) {
    if (!req.headers[header]) {
      sendJson(res, 400, { error: `Missing required header: ${header}` });
      return false;
    }
  }
  return true;
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';

    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error('Request body must be valid JSON'));
      }
    });

    req.on('error', reject);
  });
}

function toUserPayload(user, token) {
  return {
    token,
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
  };
}

function authenticate(req, res) {
  const header = req.headers.authorization;

  if (!header) {
    sendJson(res, 401, { error: 'Authorization header missing' });
    return null;
  }

  const [scheme, token] = header.split(' ');

  if (!token || scheme.toLowerCase() !== 'bearer') {
    sendJson(res, 401, { error: 'Authorization header is invalid' });
    return null;
  }

  const session = sessions.get(token);

  if (!session) {
    sendJson(res, 401, { error: 'Token is invalid or has expired' });
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    sendJson(res, 401, { error: 'Token is invalid or has expired' });
    return null;
  }

  const user = USERS.find((candidate) => candidate.id === session.userId);

  if (!user) {
    sessions.delete(token);
    sendJson(res, 401, { error: 'User not found for token' });
    return null;
  }

  return { token, user };
}

function createSession(userId) {
  const token = randomUUID();
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  sessions.set(token, { userId, expiresAt });
  return token;
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  if (!method || !url) {
    sendJson(res, 400, { error: 'Invalid request' });
    return;
  }

  const parsedUrl = new URL(url, `http://${req.headers.host ?? 'localhost'}`);
  const pathname = parsedUrl.pathname;

  if (method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  logRequest(req, pathname);

  const requiresHeaders = !['/', '/api/health'].includes(pathname);

  if (requiresHeaders && !ensureRequiredHeaders(req, res)) {
    return;
  }

  try {
    if (method === 'GET' && pathname === '/api/health') {
      sendJson(res, 200, { status: 'ok', time: new Date().toISOString() });
      return;
    }

    if (method === 'GET' && pathname === '/') {
      sendText(res, 200, 'Authentication test server is running.');
      return;
    }

    if (method === 'POST' && pathname === '/api/login') {
      let body;
      try {
        body = await readBody(req);
      } catch (error) {
        sendJson(res, 400, { error: error.message });
        return;
      }

      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';

      if (!email || !password) {
        sendJson(res, 400, { error: 'Email and password are required' });
        return;
      }

      const user = USERS.find(
        (candidate) =>
          candidate.email.toLowerCase() === email && candidate.password === password
      );

      if (!user) {
        sendJson(res, 401, { error: 'Invalid email or password' });
        return;
      }

      const token = createSession(user.id);
      sendJson(res, 200, { results: toUserPayload(user, token) });
      return;
    }

    if (method === 'POST' && pathname === '/api/logout') {
      const auth = authenticate(req, res);
      if (!auth) {
        return;
      }

      sessions.delete(auth.token);
      sendJson(res, 200, { success: true });
      return;
    }

    if (method === 'GET' && pathname === '/api/profile') {
      const auth = authenticate(req, res);
      if (!auth) {
        return;
      }

      sendJson(res, 200, { results: toUserPayload(auth.user, auth.token) });
      return;
    }

    if (method === 'POST' && pathname === '/api/verify-token') {
      const auth = authenticate(req, res);
      if (!auth) {
        return;
      }

      sendJson(res, 200, { results: { valid: true } });
      return;
    }

    sendJson(res, 404, { error: 'Endpoint not found' });
  } catch (error) {
    console.error('[auth-server] Unexpected error', error);
    sendJson(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`[auth-server] Listening on http://localhost:${PORT}`);
  console.log(
    `[auth-server] Required headers: ${REQUIRED_HEADERS.join(', ')}`
  );
  console.log(
    '[auth-server] Demo users:',
    USERS.map((user) => `${user.email} / ${user.password}`).join(', ')
  );
});
