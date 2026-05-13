import { normalizePhone, isSupportedCountry } from './phone.util';

describe('phone.util', () => {
  describe('normalizePhone', () => {
    it('normalizes Guinea number with country code', () => {
      const result = normalizePhone('+224 622 12 34 56');
      expect(result).toEqual({ e164: '+224622123456', countryCode: 'GN' });
    });

    it('normalizes Senegal number', () => {
      const result = normalizePhone('+221 77 123 45 67');
      expect(result.countryCode).toBe('SN');
    });

    it('rejects invalid number', () => {
      expect(() => normalizePhone('12345')).toThrow();
    });

    it('rejects unsupported country (France)', () => {
      expect(() => normalizePhone('+33 6 12 34 56 78')).toThrow(/Country not supported/);
    });
  });

  describe('isSupportedCountry', () => {
    it('accepts GN, SN, ML, CI, BF, TG, BJ, NE, MR', () => {
      ['GN', 'SN', 'ML', 'CI', 'BF', 'TG', 'BJ', 'NE', 'MR'].forEach((c) => {
        expect(isSupportedCountry(c)).toBe(true);
      });
    });

    it('rejects unsupported country', () => {
      expect(isSupportedCountry('US')).toBe(false);
      expect(isSupportedCountry('FR')).toBe(false);
    });
  });
});
