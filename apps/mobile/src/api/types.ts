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

export interface Domain {
  id: string;
  nameFr: string;
  nameEn?: string | null;
  icon?: string | null;
  parentId?: string | null;
  createdAt: string;
}

export interface UserDomain {
  id: string;
  userId: string;
  domainId: string;
  priority: number;
  domain: Domain;
}

export interface CandidateProfile {
  id: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  cvUrl?: string | null;
  summary?: string | null;
  location?: string | null;
  isPremium: boolean;
  premiumUntil?: string | null;
  aiCreditsRemaining: number;
  autoApplyEnabled: boolean;
  autoApplyMinMatchScore: number;
}

export interface SignedUploadUrl {
  uploadUrl: string;
  publicUrl: string;
}
