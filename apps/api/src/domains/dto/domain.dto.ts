import { z } from 'zod';

export const createDomainSchema = z.object({
  nameFr: z.string().min(1).max(80),
  nameEn: z.string().min(1).max(80).optional(),
  icon: z.string().max(8).optional(),
  parentId: z.string().uuid().optional(),
});

export const updateDomainSchema = createDomainSchema.partial();

export type CreateDomainDto = z.infer<typeof createDomainSchema>;
export type UpdateDomainDto = z.infer<typeof updateDomainSchema>;
