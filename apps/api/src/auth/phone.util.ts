import { parsePhoneNumberWithError, CountryCode } from 'libphonenumber-js';

const SUPPORTED_COUNTRIES: CountryCode[] = ['GN', 'SN', 'ML', 'CI', 'BF', 'TG', 'BJ', 'NE', 'MR'];

export function isSupportedCountry(code: string): boolean {
  return (SUPPORTED_COUNTRIES as string[]).includes(code);
}

export interface NormalizedPhone {
  e164: string;
  countryCode: string;
}

export function normalizePhone(raw: string): NormalizedPhone {
  const parsed = parsePhoneNumberWithError(raw);
  if (!parsed.isValid()) {
    throw new Error('Invalid phone number');
  }
  if (!parsed.country || !isSupportedCountry(parsed.country)) {
    throw new Error('Country not supported');
  }
  return {
    e164: parsed.number,
    countryCode: parsed.country,
  };
}
