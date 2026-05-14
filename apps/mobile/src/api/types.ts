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

export type JobType = 'cdi' | 'cdd' | 'stage' | 'freelance';
export type JobStatus = 'draft' | 'pending' | 'published' | 'closed' | 'expired';

export interface Company {
  id: string;
  name: string;
  sector: string;
  logoUrl?: string | null;
  country: string;
  city?: string | null;
  description?: string | null;
}

export interface JobSkillRel {
  jobId: string;
  skillId: string;
  skill: { id: string; name: string };
}

export interface Job {
  id: string;
  companyId: string;
  postedByUserId: string;
  title: string;
  description: string;
  domainId: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency: string;
  location?: string | null;
  country: string;
  type: JobType;
  status: JobStatus;
  deadline?: string | null;
  viewCount: number;
  applicationCount: number;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  company: Company;
  domain: Domain;
  jobSkills: JobSkillRel[];
}

export interface FeedItem {
  job: Job;
  matchScore: number;
}

export type SwipeDir = 'left' | 'right' | 'saved';

export interface SwipeRecord {
  id: string;
  candidateUserId: string;
  jobId: string;
  direction: SwipeDir;
  swipedAt: string;
  matchScoreAtSwipe?: number | null;
}

export type ApplicationStatus = 'pending' | 'viewed' | 'shortlisted' | 'rejected' | 'hired';

export interface Application {
  id: string;
  jobId: string;
  candidateUserId: string;
  status: ApplicationStatus;
  coverLetterUrl?: string | null;
  appliedVia: 'manual' | 'auto_apply';
  matchScore?: number | null;
  recruiterViewedAt?: string | null;
  appliedAt: string;
  job?: Job;
}
