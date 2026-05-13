import { z } from 'zod';

export const createJobSchema = z.object({
  companyId: z.string().uuid(),
  title: z.string().min(3).max(120),
  description: z.string().min(20).max(5000),
  domainId: z.string().uuid(),
  skillIds: z.array(z.string().uuid()).max(15).default([]),
  salaryMin: z.number().int().min(0).optional(),
  salaryMax: z.number().int().min(0).optional(),
  currency: z.string().length(3).default('GNF'),
  location: z.string().max(120).optional(),
  country: z.string().length(2),
  type: z.enum(['cdi', 'cdd', 'stage', 'freelance']),
  deadline: z.string().datetime().optional(),
});

export const updateJobSchema = createJobSchema.partial();
export type CreateJobDto = z.infer<typeof createJobSchema>;
export type UpdateJobDto = z.infer<typeof updateJobSchema>;
