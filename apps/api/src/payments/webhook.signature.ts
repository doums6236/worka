import { createHmac, timingSafeEqual } from 'crypto';

export function verifyCinetPaySignature(rawBody: string, providedSignature: string): boolean {
  const secret = process.env.CINETPAY_SECRET_KEY;
  if (!secret || !providedSignature) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  let a: Buffer;
  let b: Buffer;
  try {
    a = Buffer.from(providedSignature, 'hex');
    b = Buffer.from(expected, 'hex');
  } catch {
    return false;
  }
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
