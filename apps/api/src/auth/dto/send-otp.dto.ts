import { z } from 'zod';

export const sendOtpSchema = z.object({
  phone: z.string().min(6).max(20),
});

export type SendOtpDto = z.infer<typeof sendOtpSchema>;
