import { z } from 'zod';

export const createApplicationSchema = z.object({
  jobId: z.string().uuid(),
  coverLetterUrl: z.string().url().optional(),
});
export type CreateApplicationDto = z.infer<typeof createApplicationSchema>;

export const updateApplicationStatusSchema = z.object({
  status: z.enum(['pending', 'viewed', 'shortlisted', 'rejected', 'hired']),
});
export type UpdateApplicationStatusDto = z.infer<typeof updateApplicationStatusSchema>;
