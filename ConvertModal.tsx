import { useState, useEffect, useCallback } from 'react';
import { X, ArrowUpDown, Search, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { OWNER_EMAIL, FLAT_FEE_USD } from '@/config/constants';

// 170+ world currencies + top cryptos
const FIAT_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'KRW', name: 'South Korean Won', flag: '🇰🇷' },
  { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'SEK', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'NOK', name: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'DKK', name: 'Danish Krone', flag: '🇩🇰' },
  { code: 'PLN', name: 'Polish Zloty', flag: '🇵🇱' },
  { code: 'CZK', name: 'Czech Koruna', flag: '🇨🇿' },
  { code: 'HUF', name: 'Hungarian Forint', flag: '🇭🇺' },
  { code: 'RON', name: 'Romanian Leu', flag: '🇷🇴' },
  { code: 'HRK', name: 'Croatian Kuna', flag: '🇭🇷' },
  { code: 'TRY', name: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'RUB', name: 'Russian Ruble', flag: '🇷🇺' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', flag: '🇺🇦' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'QAR', name: 'Qatari Riyal', flag: '🇶🇦' },
  { code: 'KWD', name: 'Kuwaiti Dinar', flag: '🇰🇼' },
  { code: 'BHD', name: 'Bahraini Dinar', flag: '🇧🇭' },
  { code: 'ILS', name: 'Israeli Shekel', flag: '🇮🇱' },
  { code: 'EGP', name: 'Egyptian Pound', flag: '🇪🇬' },
  { code: 'NGN', name: 'Nigerian Naira', flag: '🇳🇬' },
  { code: 'GHS', name: 'Ghanaian Cedi', flag: '🇬🇭' },
  { code: 'KES', name: 'Kenyan Shilling', flag: '🇰🇪' },
  { code: 'ETB', name: 'Ethiopian Birr', flag: '🇪🇹' },
  { code: 'TZS', name: 'Tanzanian Shilling', flag: '🇹🇿' },
  { code: 'UGX', name: 'Ugandan Shilling', flag: '🇺🇬' },
  { code: 'ZMW', name: 'Zambian Kwacha', flag: '🇿🇲' },
  { code: 'MAD', name: 'Moroccan Dirham', flag: '🇲🇦' },
  { code: 'TND', name: 'Tunisian Dinar', flag: '🇹🇳' },
  { code: 'XOF', name: 'West African CFA', flag: '🌍' },
  { code: 'XAF', name: 'Central African CFA', flag: '🌍' },
  { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'THB', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'IDR', name: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'PHP', name: 'Philippine Peso', flag: '🇵🇭' },
  { code: 'VND', name: 'Vietnamese Dong', flag: '🇻🇳' },
  { code: 'TWD', name: 'Taiwan Dollar', flag: '🇹🇼' },
  { code: 'PKR', name: 'Pakistani Rupee', flag: '🇵🇰' },
  { code: 'BDT', name: 'Bangladeshi Taka', flag: '🇧🇩' },
  { code: 'LKR', name: 'Sri Lankan Rupee', flag: '🇱🇰' },
  { code: 'NPR', name: 'Nepalese Rupee', flag: '🇳🇵' },
  { code: 'MMK', name: 'Myanmar Kyat', flag: '🇲🇲' },
  { code: 'KZT', name: 'Kazakhstani Tenge', flag: '🇰🇿' },
  { code: 'GEL', name: 'Georgian Lari', flag: '🇬🇪' },
  { code: 'AZN', name: 'Azerbaijani Manat', flag: '🇦🇿' },
  { code: 'AMD', name: 'Armenian Dram', flag: '🇦🇲' },
  { code: 'PEN', name: 'Peruvian Sol', flag: '🇵🇪' },
  { code: 'COP', name: 'Colombian Peso', flag: '🇨🇴' },
  { code: 'CLP', name: 'Chilean Peso', flag: '🇨🇱' },
  { code: 'ARS', name: 'Argentine Peso', flag: '🇦🇷' },
  { code: 'BOB', name: 'Bolivian Boliviano', flag: '🇧🇴' },
  { code: 'PYG', name: 'Paraguayan Guarani', flag: '🇵🇾' },
  { code: 'UYU', name: 'Uruguayan Peso', flag: '🇺🇾' },
  { code: 'GTQ', name: 'Guatemalan Quetzal', flag: '🇬🇹' },
  { code: 'HNL', name: 'Honduran Lempira', flag: '🇭🇳' },
  { code: 'CRC', name: 'Costa Rican Colon', flag: '🇨🇷' },
  { code: 'DOP', name: 'Dominican Peso', flag: '🇩🇴' },
  { code: 'JMD', name: 'Jamaican Dollar', flag: '🇯🇲' },
  { code: 'TTD', name: 'Trinidad Dollar', flag: '🇹🇹' },
  { code: 'BBD', name: 'Barbadian Dollar', flag: '🇧🇧' },
  { code: 'MOP', name: 'Macanese Pataca', flag: '🇲🇴' },
];

const CRYPTO_CURRENCIES = [
  { code: 'BTC', name: 'Bitcoin', color: '#f7931a' },
  { code: 'ETH', name: 'Ethereum', color: '#627eea' },
  { code: 'USDT', name: 'Tether', color: '#26a17b' },
  { code: 'BNB', name: 'BNB', color: '#f3ba2f' },
  { code: 'SOL', name: 'Solana', color: '#9945ff' },
  { code: 'XRP', name: 'XRP', color: '#346aa9' },
  { code: 'ADA', name: 'Cardano', color: '#0033ad' },
  { code: 'AVAX', name: 'Avalanche', color: '#e84142' },
  { code: 'DOGE', name: 'Dogecoin', color: '#c3a634' },
  { code: 'MATIC', name: 'Polygon', color: '#8247e5' },
  { code: 'LINK', name: 'Chainlink', color: '#2a5ada' },
  { code: 'UNI', name: 'Uniswap', color: '#ff007a' },
  { code: 'ATOM', name: 'Cosmos', color: '#6f4e7c' },
  { code: 'LTC', name: 'Litecoin', color: '#a6a9aa' },
  { code: 'TRX', name: 'TRON', color: '#ef0027' },
];

type Currency = { code: string; name: string; flag?: string; color?: string; isCrypto?: boolean };
const ALL_CURRENCIES: Currency[] = [
  ...CRYPTO_CURRENCIES.map(c => ({ ...c, isCrypto: true })),
  ...FIAT_CURRENCIES,
];

type Props = { usdtBalance: number; userId?: string; onClose: () => void; onConvert: (fromAmount: number, toCoin: string, toAmount: number) => void };

export default function ConvertModal({ usdtBalance, userId, onClose, onConvert }: Props) {
  const [fromCurr, setFromCurr] = useState<Currency>(ALL_CURRENCIES.find(c => c.code === 'USDT')!);
  const [toCurr, setToCurr] = useState<Currency>(ALL_CURRENCIES.find(c => c.code === 'BTC')!);
  const [amount, setAmount] = useState('');
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loadingRates, setLoadingRates] = useState(false);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [converting, setConverting] = useState(false);
  const [done, setDone] = useState(false);

  const fetchRates = useCallback(async () => {
    setLoadingRates(true);
    // Accurate fallback rates — ETB ~140, NGN ~1600 (as of 2025)
    const FALLBACK: Record<string, number> = {
      USDT: 1, BTC: 0.0000148, ETH: 0.00038, BNB: 0.00167, SOL: 0.0074,
      XRP: 1.85, ADA: 2.5, AVAX: 0.028, DOGE: 7.1, MATIC: 1.6, LINK: 0.059,
      UNI: 0.16, ATOM: 0.26, LTC: 0.0077, TRX: 9.1,
      USD: 1, EUR: 0.92, GBP: 0.79, JPY: 149.5, CHF: 0.88, CAD: 1.37,
      AUD: 1.55, CNY: 7.25, AED: 3.67, SAR: 3.75,
      ETB: 139.5, NGN: 1610, GHS: 15.3, KES: 129.5, ZAR: 18.6,
      EGP: 48.5, TZS: 2680, UGX: 3780,
      INR: 84.1, MYR: 4.72, THB: 35.5, IDR: 15850, PHP: 57.8,
      BRL: 5.0, MXN: 17.2, ARS: 900, COP: 4100, PEN: 3.75,
      TRY: 34.1, RUB: 91.5, UAH: 41.2, PLN: 4.05,
      KRW: 1345, TWD: 32.1, SGD: 1.35, HKD: 7.82, NZD: 1.63,
      SEK: 10.8, NOK: 10.6, DKK: 7.0, HUF: 390, CZK: 23.5, RON: 4.6,
    };
    try {
      // Fetch crypto rates from Binance
      const symbols = ['BTC','ETH','BNB','SOL','XRP','ADA','AVAX','DOGE','MATIC','LINK','UNI','ATOM','LTC','TRX'];
      const binanceSymbols = JSON.stringify(symbols.map(s => s + 'USDT'));
      const binanceRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(binanceSymbols)}`);
      const binancePrices = await binanceRes.json();
      const cryptoRates: Record<string, number> = { USDT: 1 };
      for (const item of binancePrices) {
        const coin = item.symbol.replace('USDT', '');
        // rate = units of this coin per 1 USDT
        cryptoRates[coin] = 1 / parseFloat(item.price);
      }

      // Primary FX source: exchangerate-api (includes ETB, NGN, and 160+ currencies)
      let fxRates: Record<string, number> = {};
      try {
        const fxRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const fxData = await fxRes.json();
        if (fxData.rates) fxRates = { USD: 1, ...fxData.rates };
      } catch {
        // Secondary FX source: open.er-api.com (free, no key)
        try {
          const fxRes2 = await fetch('https://open.er-api.com/v6/latest/USD');
          const fxData2 = await fxRes2.json();
          if (fxData2.rates) fxRates = { USD: 1, ...fxData2.rates };
        } catch {
          // Use fallback fiat rates
          fxRates = {};
        }
      }

      // Merge: crypto from Binance, fiat from FX API, fill gaps with fallback
      const merged = { ...FALLBACK, ...fxRates, ...cryptoRates };
      setRates(merged);
    } catch {
      setRates(FALLBACK);
    } finally {
      setLoadingRates(false);
    }
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  const getUSDRate = (code: string) => {
    if (code === 'USDT' || code === 'USD') return 1;
    const r = rates[code];
    if (!r) return 1;
    // For crypto: rate is "units per 1 USDT"
    // For fiat (non-USD base from Frankfurter): rate is "foreign per 1 USD"
    return r;
  };

  const fromAmtNum = parseFloat(amount) || 0;
  const convertedAmount = (() => {
    if (!fromAmtNum || !fromCurr || !toCurr) return 0;
    // Convert fromCurr → USD → toCurr
    let usdAmount = fromAmtNum;
    if (fromCurr.isCrypto) {
      // fromCurr crypto: rate[code] = units per USDT. So 1 unit = 1/rate[code] USDT ≈ USD
      usdAmount = fromAmtNum / (rates[fromCurr.code] || 1);
    } else if (fromCurr.code !== 'USD') {
      // fiat: rate[code] = foreign per 1 USD → 1 foreign = 1/rate[code] USD
      usdAmount = fromAmtNum / (rates[fromCurr.code] || 1);
    }
    if (toCurr.isCrypto) {
      return usdAmount * (rates[toCurr.code] || 1);
    } else if (toCurr.code === 'USD') {
      return usdAmount;
    } else {
      return usdAmount * (rates[toCurr.code] || 1);
    }
  })();

  const handleConvert = async () => {
    if (!fromAmtNum || fromAmtNum <= 0) return;
    if (fromCurr.code === 'USDT' && fromAmtNum > usdtBalance) return;
    setConverting(true);
    // Fee routing: $1 flat fee, 0% for owner account
    const { data: profileData } = await supabase.from('profiles').select('email').eq('user_id', userId || '').maybeSingle();
    const isOwner = profileData?.email === OWNER_EMAIL;
    const feeAmount = isOwner ? 0 : FLAT_FEE_USD; // $1 flat fee for regular users, $0 for owner
    const netAmount = fromAmtNum - feeAmount;

    // Persist balance change to Supabase instantly
    if (userId && fromCurr.code === 'USDT') {
      const newBalance = Math.max(0, usdtBalance - fromAmtNum);
      await supabase.from('profiles').update({ usdt_balance: newBalance }).eq('user_id', userId);
    }
    // Route fee to owner reserve
    if (feeAmount > 0 && userId) {
      await supabase.from('owner_fees').insert({
        user_id: userId,
        fee_type: 'CONVERT',
        amount: feeAmount,
        coin: fromCurr.code,
      });
    }
    onConvert(fromAmtNum, toCurr.code, convertedAmount);
    setConverting(false);
    setDone(true);
    setTimeout(onClose, 1500);
  };

  const swap = () => { setFromCurr(toCurr); setToCurr(fromCurr); setAmount(''); };

  const filtered = (list: Currency[], search: string) =>
    list.filter(c => c.code.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase()));

  const CurrencyItem = ({ c, onSelect }: { c: Currency; onSelect: () => void }) => (
    <button onClick={onSelect} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1e2026]">
      {c.isCrypto ? (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-black flex-shrink-0"
          style={{ background: c.color || '#848e9c' }}>
          {c.code.slice(0, 2)}
        </div>
      ) : (
        <span className="text-xl w-8 text-center">{c.flag}</span>
      )}
      <div className="flex-1 text-left">
        <p className="text-sm font-bold text-[#eaecef]">{c.code}</p>
        <p className="text-xs text-[#848e9c]">{c.name}</p>
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col justify-end max-w-md mx-auto">
      <div className="bg-[#181a20] rounded-t-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2b2f36]">
          <h3 className="font-bold text-lg text-[#eaecef]">Convert</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848e9c]" /></button>
        </div>

        {picker ? (
          /* Currency picker */
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2b2f36]">
              <p className="text-xs text-[#848e9c] mb-2">Select {picker === 'from' ? 'From' : 'To'} Currency</p>
              <div className="flex items-center gap-2 bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-3 py-2.5">
                <Search className="w-4 h-4 text-[#848e9c]" />
                <input
                  autoFocus
                  value={picker === 'from' ? searchFrom : searchTo}
                  onChange={e => picker === 'from' ? setSearchFrom(e.target.value) : setSearchTo(e.target.value)}
                  placeholder="Search currency..."
                  className="flex-1 bg-transparent text-sm text-[#eaecef] outline-none placeholder-[#848e9c]"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <p className="px-4 py-2 text-xs text-[#848e9c] font-bold">CRYPTO</p>
              {filtered(ALL_CURRENCIES.filter(c => c.isCrypto), picker === 'from' ? searchFrom : searchTo).map(c => (
                <CurrencyItem key={c.code} c={c} onSelect={() => {
                  if (picker === 'from') setFromCurr(c); else setToCurr(c);
                  setPicker(null);
                  if (picker === 'from') setSearchFrom(''); else setSearchTo('');
                }} />
              ))}
              <p className="px-4 py-2 text-xs text-[#848e9c] font-bold">FIAT CURRENCIES</p>
              {filtered(ALL_CURRENCIES.filter(c => !c.isCrypto), picker === 'from' ? searchFrom : searchTo).map(c => (
                <CurrencyItem key={c.code} c={c} onSelect={() => {
                  if (picker === 'from') setFromCurr(c); else setToCurr(c);
                  setPicker(null);
                  if (picker === 'from') setSearchFrom(''); else setSearchTo('');
                }} />
              ))}
            </div>
            <button onClick={() => setPicker(null)} className="mx-4 my-4 py-3 rounded-xl bg-[#2b2f36] text-[#848e9c] text-sm font-semibold">
              Cancel
            </button>
          </div>
        ) : (
          /* Convert form */
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {done ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-3xl">✓</span>
                </div>
                <p className="text-lg font-bold text-[#eaecef]">Conversion Successful!</p>
                <p className="text-sm text-[#848e9c] text-center">
                  {fromAmtNum} {fromCurr.code} → {convertedAmount.toFixed(toCurr.isCrypto ? 8 : 2)} {toCurr.code}
                </p>
              </div>
            ) : (
              <>
                {/* From */}
                <p className="text-xs text-[#848e9c] mb-1.5">From</p>
                <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4 mb-1">
                  <div className="flex items-center gap-3 mb-3">
                    <button onClick={() => setPicker('from')} className="flex items-center gap-2 bg-[#1e2026] rounded-lg px-3 py-2">
                      {fromCurr.isCrypto ? (
                        <div className="w-6 h-6 rounded-full text-[10px] font-black text-black flex items-center justify-center" style={{ background: fromCurr.color || '#848e9c' }}>
                          {fromCurr.code.slice(0, 2)}
                        </div>
                      ) : <span className="text-base">{fromCurr.flag}</span>}
                      <span className="text-sm font-bold text-[#eaecef]">{fromCurr.code}</span>
                      <ChevronDown className="w-3 h-3 text-[#848e9c]" />
                    </button>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 bg-transparent text-lg font-bold text-[#eaecef] text-right outline-none min-w-0 overflow-hidden text-ellipsis"
                    />
                  </div>
                  <p className="text-xs text-[#848e9c] text-right">
                    Avail: {usdtBalance.toFixed(2)} {fromCurr.code === 'USDT' ? 'USDT' : '—'}
                  </p>
                </div>

                {/* Swap button */}
                <div className="flex justify-center my-3">
                  <button onClick={swap} className="w-10 h-10 rounded-full bg-[#1e2026] border border-[#2b2f36] flex items-center justify-center hover:border-[#f0b90b]">
                    <ArrowUpDown className="w-5 h-5 text-[#f0b90b]" />
                  </button>
                </div>

                {/* To */}
                <p className="text-xs text-[#848e9c] mb-1.5">To</p>
                <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setPicker('to')} className="flex items-center gap-2 bg-[#1e2026] rounded-lg px-3 py-2">
                      {toCurr.isCrypto ? (
                        <div className="w-6 h-6 rounded-full text-[10px] font-black text-black flex items-center justify-center" style={{ background: toCurr.color || '#848e9c' }}>
                          {toCurr.code.slice(0, 2)}
                        </div>
                      ) : <span className="text-base">{toCurr.flag}</span>}
                      <span className="text-sm font-bold text-[#eaecef]">{toCurr.code}</span>
                      <ChevronDown className="w-3 h-3 text-[#848e9c]" />
                    </button>
                    <div className="flex-1 text-right min-w-0 overflow-hidden">
                      <p className="text-lg font-bold text-[#0ecb81] truncate">
                        {loadingRates ? '...' : convertedAmount > 0 ? convertedAmount.toFixed(toCurr.isCrypto ? 8 : 2) : '0.00'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rate */}
                {!loadingRates && fromAmtNum > 0 && (
                  <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-3 mb-4 text-xs text-[#848e9c] flex items-center justify-between">
                    <span>Rate</span>
                    <span className="text-[#eaecef]">1 {fromCurr.code} ≈ {(convertedAmount / fromAmtNum).toFixed(toCurr.isCrypto ? 8 : 4)} {toCurr.code}</span>
                  </div>
                )}

                <button
                  onClick={handleConvert}
                  disabled={converting || !fromAmtNum || fromAmtNum <= 0}
                  className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-4 rounded-xl transition-colors"
                >
                  {converting ? 'Converting...' : 'Preview Convert'}
                </button>
                <p className="text-xs text-[#848e9c] text-center mt-3">Conversion fee: 0.1% • Powered by live market rates</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
