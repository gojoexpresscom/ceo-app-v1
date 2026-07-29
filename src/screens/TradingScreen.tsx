import { useState, useEffect } from 'react';
import {
  ArrowLeft, Star, MoreHorizontal, TrendingUp, TrendingDown,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CandlestickChart from '@/components/charts/CandlestickChart';
import { sendNotification } from '@/lib/notifications';

type TradeType = 'Spot' | 'Futures' | 'TradFi';
type OrderType = 'Limit' | 'Market' | 'TP/SL';
type Side = 'Buy' | 'Sell';

type Props = {
  symbol: string;   // e.g. 'BTC/USDT'
  binanceSymbol: string; // e.g. 'BTCUSDT'
  initialPrice: number;
  initialChange: number;
  userEmail: string;
  userId: string;
  usdtBalance: number;
  antiPhishingCode?: string;
  onBack: () => void;
  onBalanceChange: (newBalance: number) => void;
};

type OrderBook = { asks: [string, string][]; bids: [string, string][] };
type ChartInterval = '15m' | '1h' | '4h' | '1D';
const TRADE_TABS: TradeType[] = ['Spot', 'Futures', 'TradFi'];

export default function TradingScreen({
  symbol, binanceSymbol, initialPrice, initialChange,
  userEmail, userId, usdtBalance, antiPhishingCode, onBack, onBalanceChange,
}: Props) {
  const [tradeType, setTradeType] = useState<TradeType>('Spot');
  const [orderType, setOrderType] = useState<OrderType>('Limit');
  const [side, setSide] = useState<Side>('Buy');
  const [price, setPrice] = useState(initialPrice.toFixed(2));
  const [amount, setAmount] = useState('');
  const [leverage, setLeverage] = useState(10);
  const [interval, setInterval] = useState<ChartInterval>('1h');
  const [currentPrice, setCurrentPrice] = useState(initialPrice);
  const [currentChange, setCurrentChange] = useState(initialChange);
  const [stats, setStats] = useState({ high: 0, low: 0, vol: '0' });
  const [orderBook, setOrderBook] = useState<OrderBook>({ asks: [], bids: [] });
  const [showOrderBook, setShowOrderBook] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [favorited, setFavorited] = useState(false);

  const baseCoin = symbol.split('/')[0];
  const total = parseFloat(amount) * (orderType === 'Market' ? currentPrice : parseFloat(price) || currentPrice);

  const fetchTicker = useCallback(async () => {
    try {
      const endpoints = [
        `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`)}`,
      ];
      let d: { lastPrice: string; priceChangePercent: string; highPrice: string; lowPrice: string; quoteVolume: string } | null = null;
      for (const url of endpoints) {
        try {
          const res = await fetch(url);
          if (res.ok) { d = await res.json(); break; }
        } catch { /* try next */ }
      }
      if (!d) return;
      setCurrentPrice(parseFloat(d.lastPrice));
      setCurrentChange(parseFloat(d.priceChangePercent));
      setStats({
        high: parseFloat(d.highPrice),
        low: parseFloat(d.lowPrice),
        vol: (parseFloat(d.quoteVolume) / 1e6).toFixed(1) + 'M',
      });
      if (orderType === 'Market') setPrice(parseFloat(d.lastPrice).toFixed(2));
    } catch { /* ignore */ }
  }, [binanceSymbol, orderType]);

  const fetchOrderBook = useCallback(async () => {
    try {
      const endpoints = [
        `https://api.binance.com/api/v3/depth?symbol=${binanceSymbol}&limit=8`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://api.binance.com/api/v3/depth?symbol=${binanceSymbol}&limit=8`)}`,
      ];
      let d: { lastPrice: string; priceChangePercent: string; highPrice: string; lowPrice: string; quoteVolume: string } | null = null;
      for (const url of endpoints) {
        try {
          const res = await fetch(url);
          if (res.ok) { d = await res.json(); break; }
        } catch { /* try next */ }
      }
      if (!d) return;
      setOrderBook({ asks: d.asks.slice(0, 8), bids: d.bids.slice(0, 8) });
    } catch { /* ignore */ }
  }, [binanceSymbol]);

  useEffect(() => {
    fetchTicker();
    fetchOrderBook();
    const t1 = setInterval(fetchTicker, 5000);
    const t2 = setInterval(fetchOrderBook, 3000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [fetchTicker, fetchOrderBook]);

  const handlePlaceOrder = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    if (side === 'Buy' && total > usdtBalance) return;
    setPlacing(true);

    await supabase.from('transactions').insert({
      profile_email: userEmail,
      type: 'TRADE',
      coin: baseCoin,
      network: `${tradeType}_${orderType}`,
      amount: amt,
      fee: 1.00,
      destination: `${side} ${amt} ${baseCoin} @ ${price}`,
      status: 'COMPLETED',
    });

    if (side === 'Buy') {
      onBalanceChange(Math.max(0, usdtBalance - total - 1.00));
    }

    // Route $1 trade fee to owner reserve (owner exempt)
    if (userEmail !== 'gojoexpresscom@gmail.com') {
      await supabase.from('owner_fees').insert({
        user_id: userId,
        fee_type: 'TRADE',
        amount: 1.00,
        coin: 'USDT',
      });
    }

    await sendNotification({
      userId,
      type: 'TRADE',
      subject: `CEO Exchange: ${side} Order Executed`,
      message: `Your ${side} order for ${amt} ${baseCoin} at $${parseFloat(price).toFixed(2)} has been executed. Total: $${total.toFixed(2)} USDT.`,
      antiPhishingCode,
    });

    setPlacing(false);
    setOrderSuccess(true);
    setAmount('');
    setTimeout(() => setOrderSuccess(false), 2500);
  };

  const isUp = currentChange >= 0;
  const priceColor = isUp ? '#0ecb81' : '#f6465d';
  const INTERVALS: ChartInterval[] = ['15m', '1h', '4h', '1D'];

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] flex flex-col max-w-md mx-auto">
      {/* Top header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 bg-[#0b0e11] sticky top-0 z-20">
        <button onClick={onBack}><ArrowLeft className="w-6 h-6 text-[#eaecef]" /></button>
        <div className="flex items-center gap-2">
          <button>
            <span className="text-base font-bold text-[#eaecef]">{symbol}</span>
          </button>
          <ChevronDown className="w-4 h-4 text-[#848e9c]" />
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setFavorited(!favorited)}>
            <Star className={`w-5 h-5 ${favorited ? 'fill-[#f0b90b] text-[#f0b90b]' : 'text-[#848e9c]'}`} />
          </button>
          <button><MoreHorizontal className="w-5 h-5 text-[#848e9c]" /></button>
        </div>
      </div>

      {/* Trade type tabs */}
      <div className="flex px-4 gap-4 bg-[#0b0e11] border-b border-[#2b2f36] pb-0">
        {(['Convert', ...TRADE_TABS, 'Options', 'Alpha'] as string[]).map(t => (
          <button
            key={t}
            onClick={() => { if (TRADE_TABS.includes(t as TradeType)) setTradeType(t as TradeType); }}
            className={`py-2 text-sm border-b-2 transition-colors ${tradeType === t ? 'text-[#eaecef] font-bold border-[#f0b90b]' : 'text-[#848e9c] border-transparent'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Price + stats */}
      <div className="px-4 py-3 bg-[#181a20]">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black font-mono" style={{ color: priceColor }}>
            {currentPrice < 1 ? currentPrice.toFixed(4) : currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          <span className={`text-sm font-bold flex items-center gap-0.5`} style={{ color: priceColor }}>
            {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {isUp ? '+' : ''}{currentChange.toFixed(2)}%
          </span>
        </div>
        <div className="flex gap-4 mt-1 text-xs text-[#848e9c]">
          <span>24H High <span className="text-emerald-400">{stats.high > 0 ? stats.high.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</span></span>
          <span>Low <span className="text-rose-400">{stats.low > 0 ? stats.low.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</span></span>
          <span>Vol <span className="text-[#eaecef]">{stats.vol}</span></span>
        </div>
      </div>

      {/* Chart + interval selector */}
      <div className="bg-[#181a20]">
        <div className="flex items-center px-3 py-1.5 gap-1 border-b border-[#2b2f36]">
          {INTERVALS.map(iv => (
            <button
              key={iv}
              onClick={() => setInterval(iv)}
              className={`px-3 py-1 text-xs rounded font-medium transition-colors ${interval === iv ? 'bg-[#f0b90b]/20 text-[#f0b90b]' : 'text-[#848e9c]'}`}
            >
              {iv}
            </button>
          ))}
          <div className="flex-1" />
          <button className="text-xs text-[#848e9c] px-2 py-1">Depth</button>
        </div>
        <CandlestickChart symbol={binanceSymbol} interval={interval} currentPrice={currentPrice} />
      </div>

      {/* Order book / Buy-Sell toggle */}
      <div className="flex border-b border-[#2b2f36] bg-[#181a20]">
        <button
          onClick={() => setShowOrderBook(true)}
          className={`flex-1 py-2 text-xs font-semibold transition-colors ${showOrderBook ? 'text-[#eaecef] border-b-2 border-[#f0b90b]' : 'text-[#848e9c]'}`}
        >
          Order Book
        </button>
        <button
          onClick={() => setShowOrderBook(false)}
          className={`flex-1 py-2 text-xs font-semibold transition-colors ${!showOrderBook ? 'text-[#eaecef] border-b-2 border-[#f0b90b]' : 'text-[#848e9c]'}`}
        >
          {side === 'Buy' ? 'Buy Panel' : 'Sell Panel'}
        </button>
      </div>

      {showOrderBook ? (
        /* Order Book */
        <div className="bg-[#181a20] px-3 py-2 flex-1 max-h-48 overflow-hidden">
          <div className="grid grid-cols-3 text-xs text-[#848e9c] mb-1">
            <span>Price (USDT)</span>
            <span className="text-center">Size ({baseCoin})</span>
            <span className="text-right">Total</span>
          </div>
          {/* Asks (red - sell orders) */}
          {orderBook.asks.slice(0, 4).reverse().map(([p, q], i) => (
            <button key={i} onClick={() => setPrice(p)} className="w-full grid grid-cols-3 text-xs py-0.5 hover:bg-[#2b2f36]">
              <span className="text-rose-400 font-mono">{parseFloat(p).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              <span className="text-center text-[#848e9c]">{parseFloat(q).toFixed(4)}</span>
              <span className="text-right text-[#848e9c]">{(parseFloat(p) * parseFloat(q)).toFixed(2)}</span>
            </button>
          ))}
          {/* Spread */}
          <div className="flex items-center justify-center py-1 my-0.5">
            <span className="font-mono text-sm font-bold" style={{ color: priceColor }}>
              {currentPrice < 1 ? currentPrice.toFixed(4) : currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          {/* Bids (green - buy orders) */}
          {orderBook.bids.slice(0, 4).map(([p, q], i) => (
            <button key={i} onClick={() => setPrice(p)} className="w-full grid grid-cols-3 text-xs py-0.5 hover:bg-[#2b2f36]">
              <span className="text-emerald-400 font-mono">{parseFloat(p).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              <span className="text-center text-[#848e9c]">{parseFloat(q).toFixed(4)}</span>
              <span className="text-right text-[#848e9c]">{(parseFloat(p) * parseFloat(q)).toFixed(2)}</span>
            </button>
          ))}
        </div>
      ) : (
        /* Trade Panel */
        <div className="bg-[#181a20] px-4 py-3 flex-1">
          {/* Order type tabs */}
          <div className="flex gap-3 mb-3">
            {(['Limit', 'Market', 'TP/SL'] as OrderType[]).map(t => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={`text-xs font-semibold pb-1 border-b-2 transition-colors ${orderType === t ? 'text-[#eaecef] border-[#f0b90b]' : 'text-[#848e9c] border-transparent'}`}
              >
                {t}
              </button>
            ))}
          </div>
          {/* Available */}
          <div className="flex justify-between text-xs text-[#848e9c] mb-2">
            <span>Avail.</span>
            <span className="text-[#eaecef]">{usdtBalance.toFixed(2)} USDT</span>
          </div>
          {/* Price (Limit only) */}
          {orderType === 'Limit' && (
            <div className="mb-2">
              <div className="flex items-center bg-[#0b0e11] border border-[#2b2f36] rounded px-3 py-2 gap-2">
                <span className="text-xs text-[#848e9c]">Price</span>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-[#eaecef] text-right outline-none"
                />
                <span className="text-xs text-[#848e9c]">USDT</span>
              </div>
            </div>
          )}
          {orderType === 'Market' && (
            <div className="mb-2 bg-[#0b0e11] border border-[#2b2f36] rounded px-3 py-2">
              <span className="text-xs text-[#848e9c]">Market Price: </span>
              <span className="text-sm text-[#eaecef]">{currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          )}
          {/* Amount */}
          <div className="mb-2">
            <div className="flex items-center bg-[#0b0e11] border border-[#2b2f36] rounded px-3 py-2 gap-2">
              <span className="text-xs text-[#848e9c]">Amount</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-sm text-[#eaecef] text-right outline-none"
              />
              <span className="text-xs text-[#848e9c]">{baseCoin}</span>
            </div>
          </div>
          {/* Percentage buttons */}
          <div className="flex gap-1.5 mb-2">
            {[25, 50, 75, 100].map(pct => (
              <button
                key={pct}
                onClick={() => {
                  const maxAmt = usdtBalance / (parseFloat(price) || currentPrice);
                  setAmount((maxAmt * pct / 100).toFixed(6));
                }}
                className="flex-1 bg-[#0b0e11] border border-[#2b2f36] text-[#848e9c] text-xs py-1 rounded hover:border-[#474d57]"
              >
                {pct}%
              </button>
            ))}
          </div>
          {/* Futures leverage */}
          {tradeType === 'Futures' && (
            <div className="mb-2">
              <div className="flex justify-between text-xs text-[#848e9c] mb-1">
                <span>Leverage</span><span className="text-[#f0b90b]">{leverage}x</span>
              </div>
              <input type="range" min="1" max="100" value={leverage} onChange={e => setLeverage(parseInt(e.target.value))} className="w-full accent-[#f0b90b]" />
            </div>
          )}
          {/* Total */}
          <div className="flex justify-between text-xs text-[#848e9c] mb-1">
            <span>Total</span>
            <span className="text-[#eaecef]">{isNaN(total) ? '0.00' : total.toFixed(2)} USDT</span>
          </div>
        </div>
      )}

      {/* Bottom action buttons */}
      <div className="sticky bottom-0 bg-[#0b0e11] border-t border-[#2b2f36] p-4">
        {orderSuccess ? (
          <div className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 py-3 rounded-xl text-center font-bold text-sm">
            Order Placed Successfully!
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setSide('Buy'); setShowOrderBook(false); handlePlaceOrder(); }}
              disabled={placing}
              className="bg-[#0ecb81] hover:bg-emerald-500 disabled:opacity-60 text-black py-3.5 rounded-xl font-bold text-sm transition-colors"
            >
              Buy {currentPrice < 1 ? currentPrice.toFixed(4) : currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </button>
            <button
              onClick={() => { setSide('Sell'); setShowOrderBook(false); handlePlaceOrder(); }}
              disabled={placing}
              className="bg-[#f6465d] hover:bg-rose-500 disabled:opacity-60 text-white py-3.5 rounded-xl font-bold text-sm transition-colors"
            >
              Sell {currentPrice < 1 ? currentPrice.toFixed(4) : currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
