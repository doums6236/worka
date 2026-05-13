import { tokenStorage } from '../lib/secure-storage';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://workaapi-production.up.railway.app/api/v1';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = opts;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (auth) {
    const token = await tokenStorage.getAccess();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as { error?: unknown } | null;
    const message =
      errBody && typeof errBody.error === 'string' ? errBody.error : `HTTP ${res.status}`;
    throw new ApiError(res.status, errBody, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = { request, BASE_URL };
