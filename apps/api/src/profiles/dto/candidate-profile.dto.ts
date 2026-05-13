import { z } from 'zod';

export const upsertCandidateProfileSchema = z.object({
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
  summary: z.string().max(500).optional(),
  location: z.string().max(120).optional(),
  cvUrl: z.string().url().optional(),
});
export type UpsertCandidateProfileDto = z.infer<typeof upsertCandidateProfileSchema>;

export const setDomainsSchema = z.object({
  domainIds: z.array(z.string().uuid()).length(3),
});
export type SetDomainsDto = z.infer<typeof setDomainsSchema>;

export const setCvUrlSchema = z.object({
  cvUrl: z.string().url(),
});
export type SetCvUrlDto = z.infer<typeof setCvUrlSchema>;
