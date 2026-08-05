import { useState, useEffect, useCallback } from 'react';
import { Search, TrendingUp, TrendingDown, Star, ChevronRight, Plus, Gift, Users, Grid3x3, Wallet, Flame, Sparkles, ArrowUp, ArrowDown, Eye, Check } from 'lucide-react';
import CommunityFeed from '@/components/CommunityFeed';

export type Market = {
  id: string;
  display: string;
  binanceSymbol: string;
  price: number;
  change: number;
  volume: number;
  quoteVolume: number;
  category: 'Hot' | 'New' | 'Gainers' | 'Losers' | 'Favorites';
  favorite?: boolean;
  high: number;
  low: number;
};

type Props = {
  onTrade: (symbol: string, binanceSymbol: string, price: number, change: number) => void;
  onConvert: () => void;
  onDeposit: () => void;
  usdtBalance?: number;
  onNavigate?: (screen: string) => void;
  userId?: string;
  profile?: any;
};

const ALL_SYMBOLS = [
  { id: 'BTC', display: 'BTC/USDT', binance: 'BTCUSDT', launch: '2017-07-14' },
  { id: 'ETH', display: 'ETH/USDT', binance: 'ETHUSDT', launch: '2017-07-14' },
  { id: 'SOL', display: 'SOL/USDT', binance: 'SOLUSDT', launch: '2020-08-11' },
  { id: 'BNB', display: 'BNB/USDT', binance: 'BNBUSDT', launch: '2017-07-14' },
  { id: 'XRP', display: 'XRP/USDT', binance: 'XRPUSDT', launch: '2018-05-14' },
  { id: 'ADA', display: 'ADA/USDT', binance: 'ADAUSDT', launch: '2018-05-14' },
  { id: 'AVAX', display: 'AVAX/USDT', binance: 'AVAXUSDT', launch: '2020-07-21' },
  { id: 'DOGE', display: 'DOGE/USDT', binance: 'DOGEUSDT', launch: '2019-07-05' },
  { id: 'MATIC', display: 'MATIC/USDT', binance: 'MATICUSDT', launch: '2019-05-14' },
  { id: 'LINK', display: 'LINK/USDT', binance: 'LINKUSDT', launch: '2019-01-14' },
  { id: 'UNI', display: 'UNI/USDT', binance: 'UNIUSDT', launch: '2020-09-16' },
  { id: 'ATOM', display: 'ATOM/USDT', binance: 'ATOMUSDT', launch: '2019-04-29' },
  { id: 'LTC', display: 'LTC/USDT', binance: 'LTCUSDT', launch: '2017-07-14' },
  { id: 'TRX', display: 'TRX/USDT', binance: 'TRXUSDT', launch: '2018-05-14' },
  { id: 'DOT', display: 'DOT/USDT', binance: 'DOTUSDT', launch: '2020-08-18' },
  { id: 'NEAR', display: 'NEAR/USDT', binance: 'NEARUSDT', launch: '2020-10-14' },
  { id: 'APT', display: 'APT/USDT', binance: 'APTUSDT', launch: '2022-10-19' },
  { id: 'FIL', display: 'FIL/USDT', binance: 'FILUSDT', launch: '2020-10-15' },
  { id: 'ARB', display: 'ARB/USDT', binance: 'ARBUSDT', launch: '2023-03-23' },
  { id: 'OP', display: 'OP/USDT', binance: 'OPUSDT', launch: '2022-06-22' },
  { id: 'INJ', display: 'INJ/USDT', binance: 'INJUSDT', launch: '2020-11-03' },
  { id: 'SUI', display: 'SUI/USDT', binance: 'SUIUSDT', launch: '2023-05-03' },
  { id: 'SEI', display: 'SEI/USDT', binance: 'SEIUSDT', launch: '2023-08-15' },
  { id: 'TIA', display: 'TIA/USDT', binance: 'TIAUSDT', launch: '2023-10-17' },
  { id: 'PEPE', display: 'PEPE/USDT', binance: 'PEPEUSDT', launch: '2023-05-05' },
  { id: 'SHIB', display: 'SHIB/USDT', binance: 'SHIBUSDT', launch: '2020-08-28' },
  { id: 'WLD', display: 'WLD/USDT', binance: 'WLDUSDT', launch: '2023-07-24' },
  { id: 'FTM', display: 'FTM/USDT', binance: 'FTMUSDT', launch: '2019-05-14' },
  { id: 'RUNE', display: 'RUNE/USDT', binance: 'RUNEUSDT', launch: '2020-07-21' },
  { id: 'AAVE', display: 'AAVE/USDT', binance: 'AAVEUSDT', launch: '2020-10-14' },
  { id: 'MKR', display: 'MKR/USDT', binance: 'MKRUSDT', launch: '2019-05-14' },
  { id: 'GRT', display: 'GRT/USDT', binance: 'GRTUSDT', launch: '2020-12-17' },
  { id: 'SAND', display: 'SAND/USDT', binance: 'SANDUSDT', launch: '2019-05-14' },
  { id: 'MANA', display: 'MANA/USDT', binance: 'MANAUSDT', launch: '2019-05-14' },
  { id: 'AXS', display: 'AXS/USDT', binance: 'AXSUSDT', launch: '2020-11-04' },
  { id: 'CRV', display: 'CRV/USDT', binance: 'CRVUSDT', launch: '2020-08-13' },
  { id: 'IMX', display: 'IMX/USDT', binance: 'IMXUSDT', launch: '2021-11-18' },
  { id: 'LDO', display: 'LDO/USDT', binance: 'LDOUSDT', launch: '2022-05-19' },
  { id: 'STX', display: 'STX/USDT', binance: 'STXUSDT', launch: '2020-10-14' },
  { id: 'GALA', display: 'GALA/USDT', binance: 'GALAUSDT', launch: '2020-09-15' },
];

const CATEGORIES = ['Hot', 'New', 'Gainers', 'Losers', 'Favorites'] as const;

export default function HomeScreen({ onTrade, onConvert, onDeposit, usdtBalance = 0, onNavigate, userId, profile }: Props) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('Hot');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showAllMarkets, setShowAllMarkets] = useState(false);

  const fetchMarkets = useCallback(async () => {
    try {
      const symbols = ALL_SYMBOLS.map(s => s.binance);
      const symbolsParam = encodeURIComponent(JSON.stringify(symbols));
      // Try direct Binance API first, then CORS proxies as fallback
      const endpoints = [
        `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`)}`,
      ];
      let data: any[] | null = null;
      for (const url of endpoints) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json) && json.length > 0) { data = json; break; }
          }
        } catch { /* try next */ }
      }
      if (!data) throw new Error('all endpoints failed');
      const mapped: Market[] = ALL_SYMBOLS.map((s, i) => {
        const d = data![i];
        const price = parseFloat(d.lastPrice);
        const change = parseFloat(d.priceChangePercent);
        const quoteVolume = parseFloat(d.quoteVolume);
        const volume = (quoteVolume / 1e6).toFixed(1);
        return {
          id: s.id, display: s.display, binanceSymbol: s.binance,
          price, change, volume: parseFloat(volume), quoteVolume,
          high: parseFloat(d.highPrice),
          low: parseFloat(d.lowPrice),
          category: 'Hot' as const,
          favorite: favorites.has(s.id),
        };
      });
      setMarkets(mapped);
    } catch {
      setMarkets(ALL_SYMBOLS.map(s => ({
        id: s.id, display: s.display, binanceSymbol: s.binance,
        price: 0, change: 0, volume: 0, quoteVolume: 0,
        high: 0, low: 0,
        category: 'Hot' as const, favorite: favorites.has(s.id),
      })));
    } finally {
      setLoading(false);
    }
  }, [favorites]);

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 15000);
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Sort/filter logic for each tab
  const getFilteredMarkets = () => {
    let list = [...markets];

    if (category === 'Hot') {
      // Hot = highest volume (most traded)
      list.sort((a, b) => b.quoteVolume - a.quoteVolume);
    } else if (category === 'Gainers') {
      // Gainers = highest positive 24h change
      list = list.filter(m => m.change > 0);
      list.sort((a, b) => b.change - a.change);
    } else if (category === 'Losers') {
      // Losers = most negative 24h change
      list = list.filter(m => m.change < 0);
      list.sort((a, b) => a.change - b.change);
    } else if (category === 'New') {
      // New = recently listed coins (sorted by launch date, newest first)
      const newSymbols = ALL_SYMBOLS.filter(s =>
        new Date(s.launch) > new Date('2022-01-01')
      ).map(s => s.id);
      list = list.filter(m => newSymbols.includes(m.id));
      // Sort by launch date (newest first)
      list.sort((a, b) => {
        const aLaunch = ALL_SYMBOLS.find(s => s.id === a.id)?.launch || '';
        const bLaunch = ALL_SYMBOLS.find(s => s.id === b.id)?.launch || '';
        return bLaunch.localeCompare(aLaunch);
      });
    } else if (category === 'Favorites') {
      list = list.filter(m => favorites.has(m.id));
    }

    if (search) {
      list = list.filter(m => m.display.toLowerCase().includes(search.toLowerCase()));
    }

    // On home tab show only 3, on full markets view show all
    if (!showAllMarkets) {
      list = list.slice(0, 3);
    }

    return list;
  };

  const filtered = getFilteredMarkets();

  const formatVolume = (vol: number) => {
    if (vol >= 1000) return (vol / 1000).toFixed(1) + 'B';
    if (vol >= 1) return vol.toFixed(1) + 'M';
    return vol.toFixed(1) + 'K';
  };

  return (
    <div className="space-y-4">
      {/* Balance card — shows real balance, no fake money */}
      <div className="bg-gradient-to-br from-[#f0b90b] to-[#e0a800] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-black/70 font-medium">Estimated Balance</p>
          {profile?.kyc_status === 'VERIFIED' && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-black bg-black/15 px-2 py-0.5 rounded-full">
              <Check className="w-3 h-3" /> Verified
            </span>
          )}
        </div>
        <p className="text-3xl font-black text-black mb-1">${usdtBalance.toFixed(2)}</p>
        <p className="text-xs text-black/50 mb-3">
          {usdtBalance === 0
            ? 'Deposit real crypto to start trading'
            : 'Your deposited funds — trade with real money'}
        </p>
        <button onClick={onDeposit} className="w-full bg-black text-[#f0b90b] font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5">
          <Plus className="w-4 h-4" /> Deposit
        </button>
      </div>

      {/* Quick Services */}
      {onNavigate && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: Users, label: 'Invite', screen: 'invite', color: 'text-emerald-400' },
            { icon: Gift, label: 'Rewards', screen: 'rewards', color: 'text-[#f0b90b]' },
            { icon: Gift, label: 'Giveaway', screen: 'giveaway', color: 'text-violet-400' },
            { icon: Grid3x3, label: 'Services', screen: 'allServices', color: 'text-sky-400' },
          ].map(({ icon: Icon, label, screen, color }) => (
            <button key={label} onClick={() => onNavigate(screen)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-[#1e2026] transition-colors">
              <div className="w-10 h-10 bg-[#1e2026] rounded-xl flex items-center justify-center">
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <span className="text-xs text-[#848e9c]">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 bg-[#1e2026] border border-[#2b2f36] rounded-xl px-3 py-2.5">
        <Search className="w-4 h-4 text-[#848e9c]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search markets..."
          className="flex-1 bg-transparent text-sm text-[#eaecef] outline-none placeholder-[#848e9c]"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto -mx-4 px-4 pb-1">
        {CATEGORIES.map(cat => {
          const icons: Record<string, typeof Flame> = {
            Hot: Flame,
            New: Sparkles,
            Gainers: ArrowUp,
            Losers: ArrowDown,
            Favorites: Star,
          };
          const Icon = icons[cat];
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold whitespace-nowrap rounded-lg transition-colors ${category === cat ? 'bg-[#f0b90b]/20 text-[#f0b90b]' : 'text-[#848e9c] hover:text-[#eaecef]'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat}
            </button>
          );
        })}
      </div>

      {/* Market list */}
      <div className="space-y-1">
        <div className="grid grid-cols-12 gap-2 px-2 pb-2 text-xs text-[#848e9c] font-medium">
          <span className="col-span-4">Pair</span>
          <span className="col-span-3 text-right">Last Price</span>
          <span className="col-span-3 text-right">24h Change</span>
          <span className="col-span-2 text-right">Action</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#f0b90b] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-[#848e9c]">
            {category === 'Favorites' ? 'No favorites yet. Tap the star icon on any coin to add it here.' : 'No markets found.'}
          </div>
        ) : (
          filtered.map(m => {
            const isUp = m.change >= 0;
            return (
              <div key={m.id} className="grid grid-cols-12 gap-2 px-2 py-3 items-center hover:bg-[#1e2026] rounded-lg">
                <div className="col-span-4 flex items-center gap-2">
                  <button onClick={() => toggleFavorite(m.id)}>
                    <Star className={`w-3.5 h-3.5 ${favorites.has(m.id) ? 'fill-[#f0b90b] text-[#f0b90b]' : 'text-[#474d57]'}`} />
                  </button>
                  <div>
                    <p className="text-sm font-bold text-[#eaecef]">{m.display}</p>
                    <p className="text-xs text-[#848e9c]">Vol {formatVolume(m.volume)}</p>
                  </div>
                </div>
                <div className="col-span-3 text-right">
                  <p className="text-sm font-mono text-[#eaecef]">
                    {m.price > 0 ? m.price.toLocaleString(undefined, { maximumFractionDigits: m.price < 1 ? 6 : 2 }) : '—'}
                  </p>
                </div>
                <div className="col-span-3 text-right">
                  <span className={`text-sm font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isUp ? '+' : ''}{m.change.toFixed(2)}%
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <button
                    onClick={() => onTrade(m.display, m.binanceSymbol, m.price, m.change)}
                    className="bg-[#f0b90b]/10 text-[#f0b90b] text-xs font-bold px-3 py-1.5 rounded hover:bg-[#f0b90b]/20"
                  >
                    Trade
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* View All Markets / Collapse button */}
        {onNavigate && (
          <button
            onClick={() => setShowAllMarkets(!showAllMarkets)}
            className="w-full flex items-center justify-center gap-2 py-3 mt-2 text-sm font-semibold text-[#f0b90b] hover:text-amber-300 transition-colors"
          >
            {showAllMarkets ? 'Show Less' : 'View All Markets'} <ChevronRight className={`w-4 h-4 transition-transform ${showAllMarkets ? 'rotate-90' : ''}`} />
          </button>
        )}
      </div>

      {/* Community Feed (Binance Square style) */}
      {userId && profile && (
        <CommunityFeed userId={userId} profile={profile} />
      )}
    </div>
  );
}
