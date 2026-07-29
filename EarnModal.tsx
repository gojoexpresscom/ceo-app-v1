import { useState } from 'react';
import { X, TrendingUp, Check, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = {
  coin: string;
  apy: string;
  productType: string;
  minAmount: number;
  userId: string;
  usdtBalance: number;
  onClose: () => void;
  onSubscribe: (amount: number) => void;
};

export default function EarnModal({ coin, apy, productType, minAmount, userId, usdtBalance, onClose, onSubscribe }: Props) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const dailyEarnings = (parseFloat(amount) || 0) * (parseFloat(apy) / 100) / 365;
  const isLocked = productType !== 'Flexible';

  const handleSubscribe = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < minAmount) return;
    if (coin === 'USDT' && amt > usdtBalance) return;

    setLoading(true);
    await supabase.from('earn_subscriptions').insert({
      user_id: userId,
      coin,
      amount: amt,
      apy: parseFloat(apy),
      product_type: productType,
      status: 'ACTIVE',
      redeem_at: isLocked ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
    });

    if (coin === 'USDT') onSubscribe(amt);
    setLoading(false);
    setSuccess(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center max-w-md mx-auto" onClick={onClose}>
      <div className="w-full bg-slate-900 border border-slate-800 rounded-t-2xl p-5 pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-slate-200 text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Earn {coin}
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {success ? (
          <div className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
            <Check className="w-5 h-5" /> Subscribed Successfully!
          </div>
        ) : (
          <div className="space-y-4">
            {/* APY highlight */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-xl p-4 text-center">
              <p className="text-3xl font-black text-emerald-400">{apy}% APY</p>
              <p className="text-xs text-slate-400 mt-1">{productType} · Min: {minAmount} {coin}</p>
              {isLocked && (
                <p className="text-xs text-amber-400 mt-1 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" /> Locked for 30 days
                </p>
              )}
            </div>

            {/* Available balance */}
            <div className="text-xs text-slate-400">
              Available: <span className="text-emerald-400 font-bold">{usdtBalance.toFixed(2)} USDT</span>
            </div>

            {/* Amount input */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Subscription Amount ({coin})</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder={`Min ${minAmount}`}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200"
                />
                <button
                  onClick={() => setAmount(usdtBalance.toString())}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-amber-400 font-bold"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Earnings preview */}
            <div className="bg-slate-950 rounded-lg p-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Daily Earnings</span>
                <span className="text-emerald-400 font-bold">{dailyEarnings.toFixed(6)} {coin}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Monthly Earnings</span>
                <span className="text-emerald-400 font-bold">{(dailyEarnings * 30).toFixed(6)} {coin}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Yearly Earnings</span>
                <span className="text-emerald-400 font-bold">{(dailyEarnings * 365).toFixed(6)} {coin}</span>
              </div>
            </div>

            <button
              onClick={handleSubscribe}
              disabled={loading || !amount || parseFloat(amount) < minAmount}
              className="w-full bg-emerald-500 text-slate-950 py-3.5 rounded-xl font-bold text-sm disabled:opacity-50"
            >
              {loading ? 'Subscribing...' : `Subscribe to ${coin}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
