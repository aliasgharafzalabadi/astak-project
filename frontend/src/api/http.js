export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let tokenProvider = () => null;
let unauthorizedHandler = () => {};

export function configureHttp({ getToken, onUnauthorized }) {
  tokenProvider = getToken;
  unauthorizedHandler = onUnauthorized;
}

export async function request(method, path, { body, query } = {}) {
  const url = new URL(path, window.location.origin);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  });

  const token = tokenProvider();
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Is the API running?');
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const error = payload?.error ?? {};
    if (response.status === 401 && token) {
      unauthorizedHandler(error.code);
    }
    throw new ApiError(response.status, error.code ?? 'HTTP_ERROR', error.message ?? response.statusText, error.details);
  }

  return payload;
}

export const http = {
  get: (path, query) => request('GET', path, { query }),
  post: (path, body) => request('POST', path, { body }),
};
