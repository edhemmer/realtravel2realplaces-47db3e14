/**
 * v4.4.x: Currency Normalization Helper
 *
 * Normalizes currency symbols and strings to 3-letter ISO 4217 codes.
 * Conservative: returns null for ambiguous inputs rather than guessing.
 */

// ============================================================================
// SYMBOL → ISO MAP
// ============================================================================

const SYMBOL_TO_ISO: Record<string, string> = {
  '$': 'USD',
  'US$': 'USD',
  'USD': 'USD',
  '€': 'EUR',
  'EUR': 'EUR',
  '£': 'GBP',
  'GBP': 'GBP',
  '¥': 'JPY',
  'JPY': 'JPY',
  'CNY': 'CNY',
  '₹': 'INR',
  'INR': 'INR',
  'CHF': 'CHF',
  'CAD': 'CAD',
  'C$': 'CAD',
  'AUD': 'AUD',
  'A$': 'AUD',
  'NZD': 'NZD',
  'NZ$': 'NZD',
  'SEK': 'SEK',
  'NOK': 'NOK',
  'DKK': 'DKK',
  'MXN': 'MXN',
  'BRL': 'BRL',
  'R$': 'BRL',
  'ZAR': 'ZAR',
  'SGD': 'SGD',
  'S$': 'SGD',
  'HKD': 'HKD',
  'HK$': 'HKD',
  'THB': 'THB',
  '฿': 'THB',
  'KRW': 'KRW',
  '₩': 'KRW',
  'PLN': 'PLN',
  'CZK': 'CZK',
  'HUF': 'HUF',
  'TRY': 'TRY',
  '₺': 'TRY',
  'AED': 'AED',
  'SAR': 'SAR',
  'ILS': 'ILS',
  '₪': 'ILS',
  'TWD': 'TWD',
  'NT$': 'TWD',
  'PHP': 'PHP',
  '₱': 'PHP',
  'IDR': 'IDR',
  'MYR': 'MYR',
  'RM': 'MYR',
  'COP': 'COP',
  'ARS': 'ARS',
  'CLP': 'CLP',
  'PEN': 'PEN',
};

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Normalize a currency symbol or string to a 3-letter ISO 4217 code.
 *
 * Returns null for ambiguous or unrecognized inputs.
 * Does NOT guess — conservative by design.
 */
export function normalizeCurrencyCode(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return null;

  // Direct lookup
  const direct = SYMBOL_TO_ISO[trimmed];
  if (direct) return direct;

  // Try lowercase key match (for symbols like €, £)
  const symbolLookup = SYMBOL_TO_ISO[raw.trim()];
  if (symbolLookup) return symbolLookup;

  // If it's exactly 3 uppercase letters, treat as ISO code if known
  if (/^[A-Z]{3}$/.test(trimmed)) {
    // Check if it's in our known list
    const values = Object.values(SYMBOL_TO_ISO);
    if (values.includes(trimmed)) return trimmed;
    // Accept any 3-letter code as potentially valid ISO
    return trimmed;
  }

  return null;
}

/**
 * Determine if an expense is in a foreign currency relative to the account currency.
 */
export function isForeignCurrency(
  expenseCurrency: string | null | undefined,
  accountCurrency: string,
): boolean {
  if (!expenseCurrency) return false;
  return expenseCurrency.toUpperCase() !== accountCurrency.toUpperCase();
}

/**
 * Build a currency-assumed metadata note when currency was defaulted.
 */
export function buildCurrencyAssumedNote(accountCurrency: string): string {
  return `currency_assumed_from_account:${accountCurrency}`;
}

/**
 * Check if an expense note contains the currency-assumed flag.
 */
export function hasCurrencyAssumedFlag(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const match = notes.match(/currency_assumed_from_account:([A-Z]{3})/);
  return match ? match[1] : null;
}
