import { api } from './client';
import type { SendOtpResponse, AuthResponse, MeResponse } from './types';

export const authApi = {
  sendOtp: (phone: string) =>
    api.request<SendOtpResponse>('/auth/send-otp', {
      method: 'POST',
      body: { phone },
      auth: false,
    }),
  verifyOtp: (phone: string, code: string) =>
    api.request<AuthResponse>('/auth/verify-otp', {
      method: 'POST',
      body: { phone, code },
      auth: false,
    }),
  refresh: (refreshToken: string) =>
    api.request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    }),
};

export const meApi = {
  get: () => api.request<MeResponse>('/me'),
};
