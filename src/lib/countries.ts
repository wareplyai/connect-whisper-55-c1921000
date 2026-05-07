export interface Country {
  code: string; // dial code with +
  iso: string;
  name: string;
  flag: string;
}

// National (subscriber) number length range per ISO. Defaults to 6-15 if unknown.
const PHONE_LENGTHS: Record<string, [number, number]> = {
  BD: [10, 10], IN: [10, 10], PK: [10, 10], US: [10, 10], CA: [10, 10],
  GB: [10, 10], SA: [9, 9], AE: [9, 9], MY: [9, 10], SG: [8, 8],
  AF: [9, 9], AU: [9, 9], AT: [10, 11], BE: [9, 9], BR: [10, 11],
  CN: [11, 11], EG: [10, 10], FR: [9, 9], DE: [10, 11], HK: [8, 8],
  ID: [9, 12], IR: [10, 10], IQ: [10, 10], IL: [9, 9], IT: [9, 11],
  JP: [10, 10], JO: [9, 9], KE: [9, 9], KW: [8, 8], LB: [7, 8],
  MX: [10, 10], MA: [9, 9], NL: [9, 9], NZ: [8, 10], NG: [10, 10],
  NO: [8, 8], OM: [8, 8], PH: [10, 10], PL: [9, 9], PT: [9, 9],
  QA: [8, 8], RU: [10, 10], ZA: [9, 9], KR: [9, 10], ES: [9, 9],
  LK: [9, 9], SE: [9, 9], CH: [9, 9], TW: [9, 9], TH: [9, 9],
  TR: [10, 10], UA: [9, 9], VN: [9, 10], YE: [9, 9],
};

export const getPhoneLength = (iso: string): [number, number] =>
  PHONE_LENGTHS[iso] || [6, 15];

export const validatePhoneForCountry = (
  raw: string,
  country: Country
): { ok: boolean; digits: string; message?: string } => {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return { ok: false, digits, message: "The phone number field must be a valid number." };
  const [min, max] = getPhoneLength(country.iso);
  if (digits.length < min || digits.length > max) {
    return { ok: false, digits, message: "The phone number field must be a valid number." };
  }
  return { ok: true, digits };
};

// Popular countries first
export const POPULAR: Country[] = [
  { code: "+880", iso: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "+91", iso: "IN", name: "India", flag: "🇮🇳" },
  { code: "+92", iso: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "+1", iso: "US", name: "United States", flag: "🇺🇸" },
  { code: "+44", iso: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+966", iso: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+971", iso: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+60", iso: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "+65", iso: "SG", name: "Singapore", flag: "🇸🇬" },
];

export const OTHERS: Country[] = [
  { code: "+93", iso: "AF", name: "Afghanistan", flag: "🇦🇫" },
  { code: "+61", iso: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "+43", iso: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "+32", iso: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "+55", iso: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "+1", iso: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "+86", iso: "CN", name: "China", flag: "🇨🇳" },
  { code: "+20", iso: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "+33", iso: "FR", name: "France", flag: "🇫🇷" },
  { code: "+49", iso: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "+852", iso: "HK", name: "Hong Kong", flag: "🇭🇰" },
  { code: "+62", iso: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "+98", iso: "IR", name: "Iran", flag: "🇮🇷" },
  { code: "+964", iso: "IQ", name: "Iraq", flag: "🇮🇶" },
  { code: "+972", iso: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "+39", iso: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "+81", iso: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "+962", iso: "JO", name: "Jordan", flag: "🇯🇴" },
  { code: "+254", iso: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "+965", iso: "KW", name: "Kuwait", flag: "🇰🇼" },
  { code: "+961", iso: "LB", name: "Lebanon", flag: "🇱🇧" },
  { code: "+52", iso: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "+212", iso: "MA", name: "Morocco", flag: "🇲🇦" },
  { code: "+31", iso: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "+64", iso: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "+234", iso: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "+47", iso: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "+968", iso: "OM", name: "Oman", flag: "🇴🇲" },
  { code: "+63", iso: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "+48", iso: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "+351", iso: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "+974", iso: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "+7", iso: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "+27", iso: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "+82", iso: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "+34", iso: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "+94", iso: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "+46", iso: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "+41", iso: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "+886", iso: "TW", name: "Taiwan", flag: "🇹🇼" },
  { code: "+66", iso: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "+90", iso: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "+380", iso: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "+84", iso: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "+967", iso: "YE", name: "Yemen", flag: "🇾🇪" },
];

export const ALL_COUNTRIES: Country[] = [...POPULAR, ...OTHERS];

export const DEFAULT_COUNTRY = POPULAR[0]; // Bangladesh

export const findCountryByCode = (code: string): Country | undefined =>
  ALL_COUNTRIES.find((c) => c.code === code);

export const splitPhone = (full: string | null | undefined): { country: Country; number: string } => {
  if (!full) return { country: DEFAULT_COUNTRY, number: "" };
  const normalized = full.trim().startsWith("+") ? full.trim() : `+${full.trim().replace(/^\+/, "")}`;
  const sorted = [...ALL_COUNTRIES].sort((a, b) => b.code.length - a.code.length);
  const match = sorted.find((c) => normalized.startsWith(c.code));
  if (match) {
    const rest = normalized.slice(match.code.length).trim();
    // Validate that the remainder fits the country's national length; otherwise fall back.
    const [min, max] = getPhoneLength(match.iso);
    if (rest.length >= min && rest.length <= max) {
      return { country: match, number: rest };
    }
  }
  return { country: DEFAULT_COUNTRY, number: full.replace(/^\+/, "") };
};
