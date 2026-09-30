import axios from 'axios';

const TOKEN_KEY = 'rws_token';

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token, remember) {
    try {
      this.clear();
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    } catch {
      /* storage blocked – session will just not persist */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api',
  headers: { Accept: 'application/json' },
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.endsWith('/login')) {
      onUnauthorized();
    }
    return Promise.reject(err);
  }
);

export const GENERIC_ERROR = 'Something went wrong. Please try again.';

/** True when the request failed because we could not reach the server at all. */
export function isNetworkError(err) {
  return !err?.response && (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED' || !navigator.onLine);
}

/** Turn any API error into one short, human message. Never shows stack traces. */
export function errorMessage(err) {
  if (isNetworkError(err)) return 'No internet connection. Please try again.';
  const data = err?.response?.data;
  if (err?.response?.status === 422 && data) {
    if (data.errors) {
      const first = Object.values(data.errors)[0];
      if (Array.isArray(first) && first[0]) return first[0];
    }
    if (data.message) return data.message;
  }
  if (err?.response?.status < 500 && data?.message) return data.message;
  return GENERIC_ERROR;
}

export default api;
