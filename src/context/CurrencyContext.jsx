import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import api from '../api';

/**
 * Comprehensive world currencies list – display-only, no exchange rates.
 * Sorted alphabetically by code. Each entry: { code, symbol, name }.
 */
export const ALL_CURRENCIES = [
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'AFN', symbol: '؋', name: 'Afghan Afghani' },
  { code: 'ALL', symbol: 'L', name: 'Albanian Lek' },
  { code: 'AMD', symbol: '֏', name: 'Armenian Dram' },
  { code: 'ANG', symbol: 'ƒ', name: 'Netherlands Antillean Guilder' },
  { code: 'AOA', symbol: 'Kz', name: 'Angolan Kwanza' },
  { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'AWG', symbol: 'ƒ', name: 'Aruban Florin' },
  { code: 'AZN', symbol: '₼', name: 'Azerbaijani Manat' },
  { code: 'BAM', symbol: 'KM', name: 'Bosnia-Herzegovina Mark' },
  { code: 'BBD', symbol: 'Bds$', name: 'Barbadian Dollar' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev' },
  { code: 'BHD', symbol: '.د.ب', name: 'Bahraini Dinar' },
  { code: 'BIF', symbol: 'FBu', name: 'Burundian Franc' },
  { code: 'BMD', symbol: 'BD$', name: 'Bermudian Dollar' },
  { code: 'BND', symbol: 'B$', name: 'Brunei Dollar' },
  { code: 'BOB', symbol: 'Bs.', name: 'Bolivian Boliviano' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'BSD', symbol: 'B$', name: 'Bahamian Dollar' },
  { code: 'BTN', symbol: 'Nu.', name: 'Bhutanese Ngultrum' },
  { code: 'BWP', symbol: 'P', name: 'Botswanan Pula' },
  { code: 'BYN', symbol: 'Br', name: 'Belarusian Ruble' },
  { code: 'BZD', symbol: 'BZ$', name: 'Belize Dollar' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'CDF', symbol: 'FC', name: 'Congolese Franc' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CLP', symbol: 'CL$', name: 'Chilean Peso' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'COP', symbol: 'COL$', name: 'Colombian Peso' },
  { code: 'CRC', symbol: '₡', name: 'Costa Rican Colón' },
  { code: 'CUP', symbol: '₱', name: 'Cuban Peso' },
  { code: 'CVE', symbol: 'Esc', name: 'Cape Verdean Escudo' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'DJF', symbol: 'Fdj', name: 'Djiboutian Franc' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso' },
  { code: 'DZD', symbol: 'د.ج', name: 'Algerian Dinar' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
  { code: 'ERN', symbol: 'Nfk', name: 'Eritrean Nakfa' },
  { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'FJD', symbol: 'FJ$', name: 'Fijian Dollar' },
  { code: 'FKP', symbol: '£', name: 'Falkland Islands Pound' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'GEL', symbol: '₾', name: 'Georgian Lari' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  { code: 'GIP', symbol: '£', name: 'Gibraltar Pound' },
  { code: 'GMD', symbol: 'D', name: 'Gambian Dalasi' },
  { code: 'GNF', symbol: 'FG', name: 'Guinean Franc' },
  { code: 'GTQ', symbol: 'Q', name: 'Guatemalan Quetzal' },
  { code: 'GYD', symbol: 'GY$', name: 'Guyanese Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'HNL', symbol: 'L', name: 'Honduran Lempira' },
  { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna' },
  { code: 'HTG', symbol: 'G', name: 'Haitian Gourde' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'ILS', symbol: '₪', name: 'Israeli New Sheqel' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'IQD', symbol: 'ع.د', name: 'Iraqi Dinar' },
  { code: 'IRR', symbol: '﷼', name: 'Iranian Rial' },
  { code: 'ISK', symbol: 'kr', name: 'Icelandic Króna' },
  { code: 'JMD', symbol: 'J$', name: 'Jamaican Dollar' },
  { code: 'JOD', symbol: 'JD', name: 'Jordanian Dinar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'KGS', symbol: 'сом', name: 'Kyrgystani Som' },
  { code: 'KHR', symbol: '៛', name: 'Cambodian Riel' },
  { code: 'KMF', symbol: 'CF', name: 'Comorian Franc' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' },
  { code: 'KYD', symbol: 'CI$', name: 'Cayman Islands Dollar' },
  { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge' },
  { code: 'LAK', symbol: '₭', name: 'Laotian Kip' },
  { code: 'LBP', symbol: 'L£', name: 'Lebanese Pound' },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee' },
  { code: 'LRD', symbol: 'L$', name: 'Liberian Dollar' },
  { code: 'LSL', symbol: 'L', name: 'Lesotho Loti' },
  { code: 'LYD', symbol: 'ل.د', name: 'Libyan Dinar' },
  { code: 'MAD', symbol: 'MAD', name: 'Moroccan Dirham' },
  { code: 'MDL', symbol: 'L', name: 'Moldovan Leu' },
  { code: 'MGA', symbol: 'Ar', name: 'Malagasy Ariary' },
  { code: 'MKD', symbol: 'ден', name: 'Macedonian Denar' },
  { code: 'MMK', symbol: 'K', name: 'Myanmar Kyat' },
  { code: 'MNT', symbol: '₮', name: 'Mongolian Tugrik' },
  { code: 'MOP', symbol: 'MOP$', name: 'Macanese Pataca' },
  { code: 'MRU', symbol: 'UM', name: 'Mauritanian Ouguiya' },
  { code: 'MUR', symbol: 'Rs', name: 'Mauritian Rupee' },
  { code: 'MVR', symbol: 'Rf', name: 'Maldivian Rufiyaa' },
  { code: 'MWK', symbol: 'MK', name: 'Malawian Kwacha' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'MZN', symbol: 'MT', name: 'Mozambican Metical' },
  { code: 'NAD', symbol: 'N$', name: 'Namibian Dollar' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'NIO', symbol: 'C$', name: 'Nicaraguan Córdoba' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'NPR', symbol: 'Rs', name: 'Nepalese Rupee' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'OMR', symbol: 'ر.ع.', name: 'Omani Rial' },
  { code: 'PAB', symbol: 'B/.', name: 'Panamanian Balboa' },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol' },
  { code: 'PGK', symbol: 'K', name: 'Papua New Guinean Kina' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'PYG', symbol: '₲', name: 'Paraguayan Guarani' },
  { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Rial' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  { code: 'RSD', symbol: 'din.', name: 'Serbian Dinar' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'RWF', symbol: 'RF', name: 'Rwandan Franc' },
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  { code: 'SBD', symbol: 'SI$', name: 'Solomon Islands Dollar' },
  { code: 'SCR', symbol: 'Rs', name: 'Seychellois Rupee' },
  { code: 'SDG', symbol: 'ج.س.', name: 'Sudanese Pound' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'SHP', symbol: '£', name: 'Saint Helena Pound' },
  { code: 'SLL', symbol: 'Le', name: 'Sierra Leonean Leone' },
  { code: 'SOS', symbol: 'Sh', name: 'Somali Shilling' },
  { code: 'SRD', symbol: 'Sr$', name: 'Surinamese Dollar' },
  { code: 'SSP', symbol: '£', name: 'South Sudanese Pound' },
  { code: 'STN', symbol: 'Db', name: 'São Tomé & Príncipe Dobra' },
  { code: 'SYP', symbol: '£S', name: 'Syrian Pound' },
  { code: 'SZL', symbol: 'E', name: 'Swazi Lilangeni' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'TJS', symbol: 'SM', name: 'Tajikistani Somoni' },
  { code: 'TMT', symbol: 'T', name: 'Turkmenistani Manat' },
  { code: 'TND', symbol: 'د.ت', name: 'Tunisian Dinar' },
  { code: 'TOP', symbol: 'T$', name: 'Tongan Paʻanga' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'TTD', symbol: 'TT$', name: 'Trinidad & Tobago Dollar' },
  { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso' },
  { code: 'UZS', symbol: 'сўм', name: 'Uzbekistani Som' },
  { code: 'VES', symbol: 'Bs.S', name: 'Venezuelan Bolívar' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  { code: 'VUV', symbol: 'VT', name: 'Vanuatu Vatu' },
  { code: 'WST', symbol: 'WS$', name: 'Samoan Tala' },
  { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc' },
  { code: 'XCD', symbol: 'EC$', name: 'East Caribbean Dollar' },
  { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc' },
  { code: 'XPF', symbol: '₣', name: 'CFP Franc' },
  { code: 'YER', symbol: '﷼', name: 'Yemeni Rial' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha' },
  { code: 'ZWL', symbol: 'Z$', name: 'Zimbabwean Dollar' },
];

/**
 * Popular currencies shown as quick-pick cards.
 * Subset of ALL_CURRENCIES for the most commonly used ones.
 */
export const POPULAR_CODES = ['USD', 'EUR', 'GBP', 'NIO', 'MXN', 'COP'];
export const POPULAR_CURRENCIES = POPULAR_CODES.map(c => ALL_CURRENCIES.find(x => x.code === c));

// Build a Map for O(1) lookups (js-set-map-lookups)
const currencyMap = new Map(ALL_CURRENCIES.map(c => [c.code, c]));

const STORAGE_KEY = 'currency';
const DEFAULT_CODE = 'USD';

function getInitialCurrency() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return currencyMap.get(saved) || currencyMap.get(DEFAULT_CODE);
}

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  // Read from localStorage synchronously to avoid FOUC (rerender-lazy-state-init)
  const [currency, setCurrencyState] = useState(getInitialCurrency);

  // Persist to localStorage + server whenever the user changes it (rerender-functional-setstate)
  const setCurrency = useCallback(async (code) => {
    const match = currencyMap.get(code);
    if (!match) return;
    setCurrencyState(match);
    localStorage.setItem(STORAGE_KEY, code);

    // Fire-and-forget server persistence; don't block the UI
    try {
      await api.put('/user/profile', { currency: code });
    } catch {
      // Non-critical — localStorage acts as the primary source
    }
  }, []);

  // Sync from server on mount (once) — overwrites localStorage only if the
  // server has a different value, preserving "instant load" from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return; // not logged in yet
    api.get('/user/me')
      .then(res => {
        const serverCode = res.data?.currency || DEFAULT_CODE;
        if (serverCode !== currency.code) {
          const match = currencyMap.get(serverCode);
          if (match) {
            setCurrencyState(match);
            localStorage.setItem(STORAGE_KEY, serverCode);
          }
        }
      })
      .catch(() => { /* ignore — fall back to localStorage */ });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stable context value to avoid unnecessary re-renders (rerender-memo)
  const value = useMemo(() => ({
    currency,       // { code, symbol, name }
    symbol: currency.symbol,
    code: currency.code,
    setCurrency,
  }), [currency, setCurrency]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

/**
 * useCurrency() — returns { symbol, code, currency, setCurrency }
 * Example: const { symbol } = useCurrency();
 *          <span>{symbol}{amount.toFixed(2)}</span>
 */
export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}
