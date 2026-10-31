import { supabase } from './supabase';

const base =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

export async function api(path, options = {}) {
  if (!supabase) {
    throw new Error('Supabase frontend environment variables are missing.');
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  const token = data.session?.access_token;

  if (!token) {
    throw new Error('No authenticated session. Please sign in again.');
  }

  const headers = new Headers(options.headers || {});

  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${base}${path}`, {
    ...options,
    headers
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    console.error(`API error (${path}):`, response.status, body);

    throw new Error(
      body?.detail?.message ||
      body?.detail ||
      body?.message ||
      `Request failed (${response.status})`
    );
  }

  return body;
}

export const get = (path) => api(path);

export const post = (path, data) =>
  api(path, {
    method: 'POST',
    body: JSON.stringify(data)
  });

export const patch = (path, data) =>
  api(path, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
