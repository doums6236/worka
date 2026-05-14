import { getLocales, getCalendars } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';

/**
 * Worka i18n minimaliste.
 *
 * Le marché cible (Guinée + sous-région) est massivement francophone (GN, SN,
 * ML, CI, BF, TG, BJ, NE, MR). Le français reste donc la langue par défaut.
 *
 * L'anglais et l'arabe sont structurellement prêts (pour Liberia / Sierra
 * Leone / Mauritanie ar-MR plus tard) mais non encore traduits — pour l'instant
 * tout retourne le français.
 */

export type Locale = 'fr' | 'en' | 'ar';
const SUPPORTED: Locale[] = ['fr', 'en', 'ar'];
const FALLBACK: Locale = 'fr';
const STORAGE_KEY = 'worka.locale';

let cached: Locale | null = null;

export function getCountryCode(): string | null {
  const locales = getLocales();
  return locales[0]?.regionCode ?? null;
}

export function detectLocale(): Locale {
  const locales = getLocales();
  for (const l of locales) {
    const tag = (l.languageCode ?? '').toLowerCase() as Locale;
    if (SUPPORTED.includes(tag)) return tag;
  }
  return FALLBACK;
}

export async function loadLocale(): Promise<Locale> {
  if (cached) return cached;
  try {
    const stored = (await SecureStore.getItemAsync(STORAGE_KEY)) as Locale | null;
    if (stored && SUPPORTED.includes(stored)) {
      cached = stored;
      return cached;
    }
  } catch {
    // ignore
  }
  cached = detectLocale();
  return cached;
}

export async function setLocale(locale: Locale): Promise<void> {
  cached = locale;
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, locale);
  } catch {
    // ignore
  }
}

export function getLocale(): Locale {
  return cached ?? FALLBACK;
}

export function getFirstWeekday(): number {
  return getCalendars()[0]?.firstWeekday ?? 1;
}
