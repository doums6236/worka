import { z } from 'zod';

export const initPaymentSchema = z.object({
  type: z.enum(['recruiter_offer', 'recruiter_sub', 'candidate_premium']),
  jobId: z.string().uuid().optional(),
});

export type InitPaymentDto = z.infer<typeof initPaymentSchema>;
