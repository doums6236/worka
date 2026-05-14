import { request } from './api';

export type UserRole = 'candidate' | 'recruiter' | 'admin';

export interface AuthUser {
  id: string;
  phone: string;
  role: UserRole;
  status: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface MeResponse {
  id: string;
  phone: string;
  role: UserRole;
  status: string;
  countryCode?: string | null;
  createdAt: string;
  lastSeenAt?: string | null;
}

export interface Domain {
  id: string;
  nameFr: string;
  nameEn?: string | null;
  icon?: string | null;
  parentId?: string | null;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  sector: string;
  logoUrl?: string | null;
  country: string;
  city?: string | null;
  description?: string | null;
  verifiedAt?: string | null;
  ownerUserId?: string | null;
  createdAt: string;
}

export type JobStatus = 'draft' | 'pending' | 'published' | 'closed' | 'expired';
export type JobType = 'cdi' | 'cdd' | 'stage' | 'freelance';

export interface Job {
  id: string;
  title: string;
  description: string;
  status: JobStatus;
  type: JobType;
  country: string;
  city?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency: string;
  publishedAt?: string | null;
  createdAt: string;
  company: { id: string; name: string; verifiedAt?: string | null };
  domain: { id: string; nameFr: string };
  applicationCount: number;
  viewCount: number;
}

export const authApi = {
  sendOtp: (phone: string) =>
    request<{ phone: string }>('/auth/send-otp', {
      method: 'POST',
      body: { phone },
      auth: false,
    }),
  verifyOtp: (phone: string, code: string) =>
    request<AuthResponse>('/auth/verify-otp', {
      method: 'POST',
      body: { phone, code },
      auth: false,
    }),
};

export const meApi = {
  get: () => request<MeResponse>('/me'),
};

export const domainsApi = {
  list: () => request<Domain[]>('/domains'),
  create: (data: { nameFr: string; nameEn?: string; icon?: string; parentId?: string }) =>
    request<Domain>('/domains', { method: 'POST', body: data }),
  update: (id: string, data: Partial<{ nameFr: string; nameEn: string; icon: string }>) =>
    request<Domain>(`/domains/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => request<{ id: string }>(`/domains/${id}`, { method: 'DELETE' }),
};

export const companiesApi = {
  list: () => request<Company[]>('/companies'),
  get: (id: string) => request<Company>(`/companies/${id}`),
  verify: (id: string) => request<Company>(`/companies/${id}/verify`, { method: 'PATCH' }),
};

export const jobsApi = {
  list: (filter?: { status?: JobStatus; country?: string; domainId?: string }) =>
    request<Job[]>('/jobs', { query: filter ?? {} }),
  publish: (id: string) => request<Job>(`/jobs/${id}/publish`, { method: 'POST' }),
  reject: (id: string) => request<Job>(`/jobs/${id}/reject`, { method: 'POST' }),
};
