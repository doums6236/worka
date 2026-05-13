import { z } from 'zod';

export const verifyOtpSchema = z.object({
  phone: z.string().min(6).max(20),
  code: z.string().regex(/^\d{4,8}$/),
});

export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;
