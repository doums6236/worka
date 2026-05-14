export interface Country {
  code: string;
  name: string;
  prefix: string;
  flag: string;
}

/**
 * Pays cibles Worka (Guinée + sous-région ouest-africaine).
 * Ordre : Guinée en premier (marché primaire), puis francophones, puis le reste.
 */
export const COUNTRIES: Country[] = [
  { code: 'GN', name: 'Guinée', prefix: '+224', flag: '🇬🇳' },
  { code: 'SN', name: 'Sénégal', prefix: '+221', flag: '🇸🇳' },
  { code: 'ML', name: 'Mali', prefix: '+223', flag: '🇲🇱' },
  { code: 'CI', name: "Côte d'Ivoire", prefix: '+225', flag: '🇨🇮' },
  { code: 'BF', name: 'Burkina Faso', prefix: '+226', flag: '🇧🇫' },
  { code: 'NE', name: 'Niger', prefix: '+227', flag: '🇳🇪' },
  { code: 'TG', name: 'Togo', prefix: '+228', flag: '🇹🇬' },
  { code: 'BJ', name: 'Bénin', prefix: '+229', flag: '🇧🇯' },
  { code: 'MR', name: 'Mauritanie', prefix: '+222', flag: '🇲🇷' },
];

export function countryByCode(code: string | null | undefined): Country {
  if (!code) return COUNTRIES[0];
  const c = COUNTRIES.find((x) => x.code === code.toUpperCase());
  return c ?? COUNTRIES[0];
}
