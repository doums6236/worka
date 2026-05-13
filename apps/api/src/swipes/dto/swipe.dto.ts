import { z } from 'zod';

export const recordSwipeSchema = z.object({
  jobId: z.string().uuid(),
  direction: z.enum(['left', 'right', 'saved']),
  matchScore: z.number().int().min(0).max(100).optional(),
});

export type RecordSwipeDto = z.infer<typeof recordSwipeSchema>;
