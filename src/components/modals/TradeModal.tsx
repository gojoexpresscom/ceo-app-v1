import { useState } from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = {
  symbol: string;
  price: number;
  change: number;
  userEmail: string;
  usdtBalance: number;
  onClose: () => void;
  onTrade: (amount: number) => void;
};

export default function TradeModal({ symbol, price, change, userEmail, usdtBalance, onClose, onTrade }: Props) {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [amount, setAmount] = useState('');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState(price.toFixed(2));
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isUp = change >= 0;
  const baseCoin = symbol.split('/')[0];
  const total = parseFloat(amount) * (orderType === 'MARKET' ? price : parseFloat(limitPrice) || 0);

  const handleTrade = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    if (side === 'BUY' && total > usdtBalance) return;

    setLoading(true);
    await supabase.from('transactions').insert({
      profile_email: userEmail,
      type: 'TRADE',
      coin: baseCoin,
      network: 'SPOT',
      amount: amt,
      fee: total * 0.001,
      destination: `${side} ${baseCoin}`,
      status: 'COMPLETED',
    });

    if (side === 'BUY') onTrade(total);
    setLoading(false);
    setSuccess(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-slate-900 border border-slate-800 rounded-t-2xl p-5 pb-8" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-slate-200 text-lg">{symbol}</h3>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-base text-slate-200">${price.toLocaleString(undefined, { maximumFractionDigits: price < 1 ? 4 : 2 })}</span>
              <span className={`text-xs flex items-center gap-0.5 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(change)}%
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buy/Sell tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg mb-4">
          <button
            onClick={() => setSide('BUY')}
            className={`py-2 rounded text-sm font-bold transition-colors ${side === 'BUY' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}
          >
            Buy {baseCoin}
          </button>
          <button
            onClick={() => setSide('SELL')}
            className={`py-2 rounded text-sm font-bold transition-colors ${side === 'SELL' ? 'bg-rose-500 text-slate-100' : 'text-slate-400'}`}
          >
            Sell {baseCoin}
          </button>
        </div>

        {/* Order type */}
        <div className="flex gap-3 mb-4">
          {(['MARKET', 'LIMIT'] as const).map(t => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`text-xs font-semibold pb-1 border-b-2 transition-colors ${orderType === t ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-500'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Available balance */}
        <div className="text-xs text-slate-400 mb-3">
          Available: <span className="text-emerald-400 font-bold">{usdtBalance.toFixed(2)} USDT</span>
        </div>

        {/* Limit price */}
        {orderType === 'LIMIT' && (
          <div className="mb-3">
            <label className="text-xs text-slate-400 block mb-1">Limit Price (USDT)</label>
            <input
              type="number"
              value={limitPrice}
              onChange={e => setLimitPrice(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200"
            />
          </div>
        )}

        {/* Amount */}
        <div className="mb-3">
          <label className="text-xs text-slate-400 block mb-1">Amount ({baseCoin})</label>
          <div className="relative">
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200"
            />
            <button
              onClick={() => setAmount((usdtBalance / price).toFixed(6))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-amber-400 font-bold"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Order total */}
        <div className="bg-slate-950 rounded-lg p-3 mb-4 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Order Total</span>
            <span className="text-slate-200 font-bold">{isNaN(total) ? '0.00' : total.toFixed(2)} USDT</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Trading Fee (0.1%)</span>
            <span className="text-slate-200">{isNaN(total) ? '0.00' : (total * 0.001).toFixed(4)} USDT</span>
          </div>
        </div>

        {success ? (
          <div className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center py-3 rounded-xl font-bold text-sm">
            Order Placed Successfully!
          </div>
        ) : (
          <button
            onClick={handleTrade}
            disabled={loading || !amount || (side === 'BUY' && total > usdtBalance)}
            className={`w-full py-3.5 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors ${
              side === 'BUY' ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950' : 'bg-rose-500 hover:bg-rose-600 text-white'
            }`}
          >
            {loading ? 'Placing Order...' : `${side} ${baseCoin}`}
          </button>
        )}
      </div>
    </div>
  );
}
