// src/api/client.js
//
// Every request in the app goes through here. That gives us one place
// for the base URL, one place for auth headers, and one place to decide
// what happens when a token expires.

// Vite replaces import.meta.env at build time. Set VITE_API_URL in
// frontend/.env for local work and in the host's dashboard for
// production; the fallback keeps `npm run dev` working with no setup.
export const API_BASE =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const TOKEN_KEY = 'prezence_token';
const REFRESH_KEY = 'prezence_refresh';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

export const setTokens = (access, refresh) => {
  if (access) localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
};

export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

export const isLoggedIn = () => getToken() !== null;

/* ── Error text ──────────────────────────────────────────────────────
   DRF returns errors in several shapes: {"detail": "..."},
   {"error": "..."}, or {"field": ["message"]}. Pull out something a
   teacher can actually read, whichever shape arrived. */

export const readableError = (data, fallback = 'Something went wrong.') => {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;

  const first = Object.values(data)[0];
  if (Array.isArray(first) && first.length) return String(first[0]);
  if (typeof first === 'string') return first;
  return fallback;
};

/* ── Session expiry ──────────────────────────────────────────────────
   An expired token used to fail silently: localStorage still held a
   string, so the app looked logged in while every request returned 401
   and the teacher just saw "could not load" everywhere. */

let redirecting = false;

const forceLogin = () => {
  clearTokens();
  const path = window.location.pathname;
  // Don't bounce someone who's already sitting on an auth page.
  if (redirecting || path === '/login' || path === '/register') return;
  redirecting = true;
  window.location.replace('/login?expired=1');
};

// Exchange the refresh token for a new access token. Runs at most once
// per failed request, and only one refresh runs at a time even if
// several requests fail together.
let refreshInFlight = null;

const refreshAccessToken = async () => {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json();
        if (data.access) {
          setTokens(data.access, data.refresh);
          return data.access;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
};

/* ── The request wrapper ─────────────────────────────────────────── */

const buildHeaders = (auth, hasBody) => {
  const headers = {};
  if (hasBody) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const request = async (
  path,
  { method = 'GET', body, auth = true, fallbackError } = {}
) => {
  // A FormData body (file uploads) must go through untouched, and the
  // browser must set its own multipart Content-Type with the boundary
  // string — setting it by hand breaks the upload.
  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData;

  const send = async () =>
    fetch(`${API_BASE}${path}`, {
      method,
      headers: buildHeaders(auth, body !== undefined && !isFormData),
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });

  let response;
  try {
    response = await send();
  } catch (error) {
    return {
      success: false,
      error: 'Cannot reach the server. Check that the backend is running.',
      networkError: true,
    };
  }

  // Expired access token: renew once, retry once, and only give up
  // (and send them to login) if that also fails.
  if (response.status === 401 && auth) {
    const renewed = await refreshAccessToken();
    if (renewed) {
      try {
        response = await send();
      } catch {
        return { success: false, error: 'Cannot reach the server.', networkError: true };
      }
    }
    if (response.status === 401) {
      forceLogin();
      return { success: false, error: 'Your session expired. Please log in again.' };
    }
  }

  if (response.status === 429) {
    return {
      success: false,
      error: 'Too many attempts. Please wait a minute and try again.',
    };
  }

  // 204 No Content (a successful DELETE) has no body to parse.
  if (response.status === 204) return { success: true, data: null };

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.ok) return { success: true, data };
  return { success: false, error: readableError(data, fallbackError), data };
};
/* ── Saving a server-generated file ──────────────────────────────────
   Exports arrive base64-encoded inside a normal JSON response (see
   ExportSummaryView for why: download managers like IDM hijack raw
   file responses and abort the app's fetch). This decodes the payload
   and hands the file to the browser from memory via a blob URL, which
   nothing can intercept. */

export const saveEncodedFile = ({ content, mime, filename }) => {
  try {
    const binary = atob(content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || 'download';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return { success: true };
  } catch {
    return { success: false, error: 'The downloaded file could not be saved.' };
  }
};