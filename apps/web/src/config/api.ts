export const API_HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
export const API_PORT = '3030';
export const API_BASE_URL = `http://${API_HOST}:${API_PORT}`;
export const WS_BASE_URL = `ws://${API_HOST}:${API_PORT}`;

export function getApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = getApiUrl(endpoint);
  return fetch(url, {
    credentials: 'include',
    ...options,
  });
}

export async function apiJson<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(endpoint, options);
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const err = await res.json();
      if (err && typeof err === 'object' && 'error' in err) {
        errorMsg = String((err as { error: unknown }).error);
      }
    } catch {}
    throw new Error(errorMsg);
  }
  return res.json() as Promise<T>;
}
