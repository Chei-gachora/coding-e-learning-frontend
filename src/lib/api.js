const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let csrfToken = null;
let refreshInFlight;

function getErrorMessage(data, status) {
  if (data?.detail) return data.detail;
  if (data && typeof data === 'object') {
    const messages = Object.values(data).flat(Infinity).filter(Boolean);
    if (messages.length) return messages.join(' ');
  }
  return typeof data === 'string' && data ? data : `Request failed (${status}).`;
}

async function readResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    if (response.ok) {
      throw new ApiError('The server returned an unreadable response.', {
        status: response.status,
      });
    }
    return text;
  }
}

async function getCsrfToken() {
  if (csrfToken) return csrfToken;

  let response;
  try {
    response = await fetch(`${API_URL}/auth/csrf/`, { credentials: 'include' });
  } catch {
    throw new ApiError('Unable to reach the server. Check your connection and try again.');
  }

  const data = await readResponse(response);
  if (!response.ok || !data?.csrfToken) {
    throw new ApiError(getErrorMessage(data, response.status), {
      status: response.status,
      data,
    });
  }
  csrfToken = data.csrfToken;
  return csrfToken;
}

async function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const token = await getCsrfToken();
      const response = await fetch(`${API_URL}/auth/login/refresh/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': token },
        credentials: 'include',
      });
      return response.ok;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const upperMethod = method.toUpperCase();
  const headers = {};
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(upperMethod)) {
    headers['X-CSRFToken'] = await getCsrfToken();
  }

  const send = async () => {
    try {
      return await fetch(`${API_URL}${path}`, {
        method: upperMethod,
        headers,
        body: body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
        credentials: 'include',
      });
    } catch {
      throw new ApiError('Unable to reach the server. Check your connection and try again.');
    }
  };

  let response = await send();
  if (response.status === 401 && auth) {
    if (await refreshSession()) response = await send();
  }

  const data = await readResponse(response);
  if (!response.ok) {
    throw new ApiError(getErrorMessage(data, response.status), {
      status: response.status,
      data,
    });
  }
  return data;
}

export const api = {
  login: async (email, password) => {
    const result = await request('/auth/login/', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    csrfToken = result?.csrfToken || csrfToken;
    return result;
  },
  logout: () => request('/auth/logout/', { method: 'POST', body: {}, auth: false }),
  register: (payload) => request('/auth/register/', {
    method: 'POST',
    body: payload,
    auth: false,
  }),
  me: () => request('/auth/me/', { auth: false }),
  requestPasswordReset: (email) => request('/auth/password-reset/', {
    method: 'POST',
    body: { email },
    auth: false,
  }),
  confirmPasswordReset: (payload) => request('/auth/password-reset/confirm/', {
    method: 'POST',
    body: payload,
    auth: false,
  }),
  verifyEmail: (uid, token) => request('/auth/email/verify/', {
    method: 'POST',
    body: { uid, token },
    auth: false,
  }),
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

export function clearLegacyTokens() {
  localStorage.removeItem('codelearn_user');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth');
  csrfToken = null;
}
