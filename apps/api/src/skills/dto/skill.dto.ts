import { z } from 'zod';

export const createSkillSchema = z.object({
  name: z.string().min(1).max(80),
  domainId: z.string().uuid().optional(),
});

export const updateSkillSchema = createSkillSchema.partial();

export type CreateSkillDto = z.infer<typeof createSkillSchema>;
export type UpdateSkillDto = z.infer<typeof updateSkillSchema>;
