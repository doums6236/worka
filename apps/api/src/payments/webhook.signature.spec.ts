import { verifyCinetPaySignature } from './webhook.signature';
import { createHmac } from 'crypto';

describe('verifyCinetPaySignature', () => {
  const secret = 'test_secret_key';
  const payload = '{"transaction_id":"abc","status":"ACCEPTED"}';
  const validSignature = createHmac('sha256', secret).update(payload).digest('hex');

  beforeEach(() => { process.env.CINETPAY_SECRET_KEY = secret; });

  it('accepts a valid signature', () => {
    expect(verifyCinetPaySignature(payload, validSignature)).toBe(true);
  });

  it('rejects a tampered signature', () => {
    expect(verifyCinetPaySignature(payload, 'a'.repeat(64))).toBe(false);
  });

  it('rejects when signature is missing', () => {
    expect(verifyCinetPaySignature(payload, '')).toBe(false);
  });

  it('rejects non-hex signature', () => {
    expect(verifyCinetPaySignature(payload, 'not-hex-at-all!!')).toBe(false);
  });
});
