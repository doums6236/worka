import { api } from './client';
import type {
  SendOtpResponse,
  AuthResponse,
  MeResponse,
  Domain,
  UserDomain,
  CandidateProfile,
  SignedUploadUrl,
} from './types';

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

export const domainsApi = {
  list: () => api.request<Domain[]>('/domains'),
};

export const candidateProfileApi = {
  get: () => api.request<CandidateProfile>('/me/candidate-profile'),
  getDomains: () => api.request<UserDomain[]>('/me/candidate-profile/domains'),
  setDomains: (domainIds: string[]) =>
    api.request<UserDomain[]>('/me/candidate-profile/domains', {
      method: 'PUT',
      body: { domainIds },
    }),
  cvUploadUrl: () =>
    api.request<SignedUploadUrl>('/me/candidate-profile/cv-upload-url', {
      method: 'POST',
    }),
  setCvUrl: (cvUrl: string) =>
    api.request<CandidateProfile>('/me/candidate-profile/cv', {
      method: 'PATCH',
      body: { cvUrl },
    }),
};
