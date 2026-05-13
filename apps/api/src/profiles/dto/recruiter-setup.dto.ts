import { z } from 'zod';

export const recruiterSetupSchema = z.object({
  company: z.object({
    name: z.string().min(2).max(120),
    sector: z.string().min(2).max(80),
    country: z.string().length(2),
    city: z.string().max(80).optional(),
    description: z.string().max(1000).optional(),
    logoUrl: z.string().url().optional(),
  }),
  roleInCompany: z.string().min(2).max(80),
});

export type RecruiterSetupDto = z.infer<typeof recruiterSetupSchema>;
