export type UserRole = 'candidate' | 'recruiter' | 'admin';

export interface SendOtpResponse {
  phone: string;
}

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
  updatedAt: string;
  lastSeenAt?: string | null;
}
