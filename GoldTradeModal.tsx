import { useState } from 'react';
import { X, TrendingUp, TrendingDown, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = {
  side: 'BUY' | 'SELL';
  leverage: number;
  goldPrice: number;
  margin: number;
  userId: string;
  userEmail: string;
  onClose: () => void;
  onTrade: (margin: number) => void;
};

export default function GoldTradeModal({ side, leverage, goldPrice, margin, userId, userEmail, onClose, onTrade }: Props) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const positionSize = margin * leverage;
  const estProfit1Percent = positionSize * 0.01;
  const liquidationPrice = side === 'BUY'
    ? goldPrice * (1 - 1 / leverage)
    : goldPrice * (1 + 1 / leverage);

  const handleConfirm = async () => {
    setLoading(true);
    await supabase.from('gold_positions').insert({
      user_id: userId,
      profile_email: userEmail,
      side,
      leverage,
      entry_price: goldPrice,
      usdt_margin: margin,
      status: 'OPEN',
    });
    await supabase.from('transactions').insert({
      profile_email: userEmail,
      type: 'TRADE',
      coin: 'XAUUSD',
      network: 'TRADFI',
      amount: margin,
      fee: 0,
      destination: `${side} ${leverage}x Gold`,
      status: 'COMPLETED',
    });
    onTrade(margin);
    setLoading(false);
    setSuccess(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-slate-900 border border-slate-800 rounded-t-2xl p-5 pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-slate-200 text-lg flex items-center gap-2">
            {side === 'BUY' ? <TrendingUp className="w-5 h-5 text-emerald-400" /> : <TrendingDown className="w-5 h-5 text-rose-400" />}
            Confirm {side === 'BUY' ? 'Long' : 'Short'}
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {success ? (
          <div className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
            <Check className="w-5 h-5" /> Position Opened!
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-950 rounded-xl p-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Direction</span>
                <span className={`font-bold ${side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {side === 'BUY' ? 'LONG' : 'SHORT'} {leverage}x
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Entry Price</span>
                <span className="text-slate-200 font-mono">${goldPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Margin</span>
                <span className="text-slate-200 font-bold">{margin.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Position Size</span>
                <span className="text-amber-400 font-bold">${positionSize.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Est. P/L (+1%)</span>
                <span className="text-emerald-400 font-bold">+{estProfit1Percent.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Liq. Price</span>
                <span className="text-rose-400 font-mono">${liquidationPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3">
              <p className="text-xs text-rose-400/80">
                {leverage}x leverage means a {(100 / leverage).toFixed(2)}% price move against you will liquidate your position. Trade responsibly.
              </p>
            </div>

            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-bold text-sm disabled:opacity-50 ${
                side === 'BUY' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
              }`}
            >
              {loading ? 'Opening Position...' : `Confirm ${side === 'BUY' ? 'Long' : 'Short'} ${leverage}x`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
